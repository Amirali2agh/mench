import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.managers.room_manager import room_manager
from app.services.game_service import GameService
from app.redis_client import redis_client
from app.services.prize_service import report_winner, update_room_status

router = APIRouter()


async def forfeit_active_player(room_id: str, player_id: str) -> None:
    """
    Callback function executed when a player remains disconnected for more than 60 seconds.
    Sets the game status to finished and declares the remaining online opponent as the winner.
    """
    state = await GameService.get_game(room_id)
    if state and state["status"] == "playing":
        state["status"] = "finished"
        # Find an active opponent to declare as the winner
        opponents = [p for p in state["players"] if p["id"] != player_id]
        if opponents:
            state["winner_id"] = opponents[0]["id"]

        await GameService.save_game(room_id, state)
        # Broadcast the forfeit state update to the remaining players in the room
        await room_manager.broadcast(room_id, {
            "type": "sync_state",
            "game": state
        })


async def report_game_winner(room_id: str, state: dict) -> None:
    """
    Report game winner to porteghal and update room status.
    Shared helper used by both WebSocket endpoints.
    """
    if state.get("status") != "finished" or not state.get("winner_id"):
        return
    try:
        meta_key = f"room:{room_id}:meta"
        raw = await redis_client.get(meta_key)
        if raw:
            meta = json.loads(raw)
            winner_player_num = next(
                (num for num, mp in meta.get("players_meta", {}).items()
                 if mp.get("id") == state["winner_id"]),
                None
            )
            if winner_player_num:
                await report_winner(
                    room_id=room_id,
                    player_id=state["winner_id"],
                    win_type="normal",
                )
            await update_room_status(room_id=room_id, status="finished")
    except Exception as e:
        print(f"⚠️ Prize service error: {e}")


async def handle_gameplay_loop(
    websocket: WebSocket,
    room_id: str,
    player_id: str,
    player_name: str,
) -> None:
    """
    Shared gameplay message loop used by both WebSocket endpoints.
    Handles roll_dice, move_piece, next_round, restart_game, chat, pass_turn.
    """
    while True:
        data = await websocket.receive_text()

        try:
            message = json.loads(data)
            action = message.get("action")

            # Action 1: Rolling the dice
            if action == "roll_dice":
                state = await GameService.roll_dice(room_id, player_id)
                await room_manager.broadcast(room_id, {
                    "type": "sync_state",
                    "game": state
                })

            # Action 2: Moving a specific piece
            elif action == "move_piece":
                piece_index = message.get("piece_index")
                if piece_index is None:
                    await websocket.send_json({
                        "type": "error",
                        "message": "piece_index is required for move_piece action"
                    })
                    continue

                try:
                    parsed_index = int(piece_index)
                except (ValueError, TypeError):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid piece_index format. Must be an integer."
                    })
                    continue

                state = await GameService.move_piece(room_id, player_id, parsed_index)
                await room_manager.broadcast(room_id, {
                    "type": "sync_state",
                    "game": state
                })

                # Report winner to porteghal if game finished
                await report_game_winner(room_id, state)

            # Action 3: Reset pieces for next round but keep session/players intact
            elif action == "next_round":
                state = await GameService.get_game(room_id)
                if state:
                    state = await GameService.create_game(room_id, state["players"], state["pieces_count"], state["player_count"])
                    await room_manager.broadcast(room_id, {
                        "type": "sync_state",
                        "game": state
                    })

            # Action 4: Completely restart and clear the game
            elif action == "restart_game":
                state = await GameService.get_game(room_id)
                if state:
                    state = await GameService.create_game(room_id, state["players"], state["pieces_count"], state["player_count"])
                    await room_manager.broadcast(room_id, {
                        "type": "sync_state",
                        "game": state
                    })

            # Action 5: Chat message
            elif action == "chat":
                chat_text = message.get("message", "").strip()
                sender_name = message.get("playerName", player_name)
                if chat_text:
                    await room_manager.broadcast(room_id, {
                        "type": "chat",
                        "player_id": player_id,
                        "player_name": sender_name,
                        "message": chat_text,
                    })

            # Action 6: Auto-pass turn on timeout
            elif action == "pass_turn":
                state = await GameService.get_game(room_id)
                if state and state["status"] == "playing":
                    state = GameService._rotate_turn(state)
                    await GameService.save_game(room_id, state)
                    await room_manager.broadcast(room_id, {
                        "type": "sync_state",
                        "game": state
                    })

        except json.JSONDecodeError:
            await websocket.send_json({
                "type": "error",
                "message": "Malformed JSON payload received"
            })
        except ValueError as e:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"An unexpected error occurred: {str(e)}"
            })


# ─── Existing endpoint: matchmaking queue → room flow ───────────────────────

@router.websocket("/ws/room/{room_id}")
async def websocket_room_endpoint(
    websocket: WebSocket,
    room_id: str,
    playerId: str = Query(...),
    playerName: str = Query(...)
):
    """
    WebSocket endpoint for active Mensch game rooms. Handles real-time gameplay actions
    including rolling, moving, next rounds, restarts, and disconnection timers.
    Used by the matchmaking queue flow.
    """
    # Accept and register player connection in the target room
    await room_manager.connect(room_id, playerId, websocket)

    try:
        # Load or initialize the Mensch game state
        state = await GameService.get_game(room_id)
        if not state:
            # Fetch the dynamic pieces count selected during queue registration
            raw_pieces_count = await redis_client.get(f"room:{room_id}:pieces_count")
            pieces_count = int(raw_pieces_count) if raw_pieces_count else 4

            # Fetch the target player capacity (e.g. 2 or 4) set by matchmaking queue
            raw_player_count = await redis_client.get(f"room:{room_id}:player_count")
            player_count = int(raw_player_count) if raw_player_count else 2

            # Fetch player names/metadata dynamically to propagate back in sync_state
            player_meta = await redis_client.get(f"player:{playerId}:meta")
            meta_dict = json.loads(player_meta) if player_meta else {"id": playerId, "name": playerName, "avatar": ""}

            # Initialize room state with the correct fixed room capacity
            initial_players = [meta_dict]
            state = await GameService.create_game(room_id, initial_players, pieces_count, player_count)
        else:
            # If state already exists but connecting player is missing from players list
            player_ids = [p["id"] for p in state["players"]]
            if playerId not in player_ids:
                player_meta = await redis_client.get(f"player:{playerId}:meta")
                meta_dict = json.loads(player_meta) if player_meta else {"id": playerId, "name": playerName, "avatar": ""}
                state["players"].append(meta_dict)
                # Initialize pieces for this late joiner matching the room piece count
                state["pieces"][playerId] = [-1] * state["pieces_count"]
                await GameService.save_game(room_id, state)

        # Broadcast the initial state sync to all connected players in the room
        await room_manager.broadcast(room_id, {
            "type": "sync_state",
            "game": state
        })

        # Shared gameplay loop
        await handle_gameplay_loop(websocket, room_id, playerId, playerName)

    except WebSocketDisconnect:
        room_manager.disconnect(room_id, playerId)
        room_manager.start_disconnect_timer(room_id, playerId, forfeit_active_player)
    except Exception:
        room_manager.disconnect(room_id, playerId)
        room_manager.start_disconnect_timer(room_id, playerId, forfeit_active_player)


# ─── New endpoint: porteghal direct room mode ────────────────────────────

@router.websocket("/ws/game/{room_id}/{player_num}")
async def websocket_game_endpoint(
    websocket: WebSocket,
    room_id: str,
    player_num: str,
):
    """
    Porteghal-compatible WebSocket endpoint.
    Path format: /ws/game/{room_id}/{player_num}
    player_num is "1" or "2".

    - Looks up player metadata from the room (pre-populated by POST /api/rooms)
    - Sends game_info message on connect (porteghal contract)
    - Syncs game state
    - Reuses the shared gameplay loop
    """
    # Look up room meta
    meta_key = f"room:{room_id}:meta"
    raw = await redis_client.get(meta_key)
    if not raw:
        await websocket.close(code=4004, reason="Room not found")
        return

    room_meta = json.loads(raw)
    players_meta = room_meta.get("players_meta", {})
    player_meta = players_meta.get(player_num, {})
    player_id = player_meta.get("id", f"player_{player_num}")
    player_name = player_meta.get("name", f"بازیکن {player_num}")

    # Accept and register connection
    await room_manager.connect(room_id, player_id, websocket)

    try:
        # Send game_info message (porteghal contract — provides player names/avatars)
        await websocket.send_json({
            "type": "game_info",
            "room_id": room_id,
            "player_num": int(player_num),
            "players": players_meta,
            "coin_bet": room_meta.get("coin_bet", 0),
        })

        # Sync or initialize game state
        state = await GameService.get_game(room_id)
        if state:
            await room_manager.broadcast(room_id, {
                "type": "sync_state",
                "game": state,
            })
        else:
            # Create game state if not pre-created (e.g. if only 1 player joined via create_room)
            pieces_count = int(room_meta.get("pieces_count", 4))
            player_count = int(room_meta.get("player_count", 2))
            state = await GameService.create_game(
                room_id,
                [player_meta],
                pieces_count=pieces_count,
                player_count=player_count,
            )
            await room_manager.broadcast(room_id, {
                "type": "sync_state",
                "game": state,
            })

        # Shared gameplay loop
        await handle_gameplay_loop(websocket, room_id, player_id, player_name)

    except WebSocketDisconnect:
        room_manager.disconnect(room_id, player_id)
        room_manager.start_disconnect_timer(room_id, player_id, forfeit_active_player)
    except Exception:
        room_manager.disconnect(room_id, player_id)
        room_manager.start_disconnect_timer(room_id, player_id, forfeit_active_player)
