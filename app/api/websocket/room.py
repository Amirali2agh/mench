import json
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

        # Main gameplay listen loop
        while True:
            data = await websocket.receive_text()
            
            # Inner try-except to isolate game logic exceptions from network level disconnections.
            try:
                message = json.loads(data)
                action = message.get("action")
                
                # Action 1: Rolling the dice
                if action == "roll_dice":
                    state = await GameService.roll_dice(room_id, playerId)
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
                    
                    # Safe cast to prevent ValueError crash from unparsable string indices
                    try:
                        parsed_index = int(piece_index)
                    except (ValueError, TypeError):
                        await websocket.send_json({
                            "type": "error",
                            "message": "Invalid piece_index format. Must be an integer."
                        })
                        continue

                    state = await GameService.move_piece(room_id, playerId, parsed_index)
                    await room_manager.broadcast(room_id, {
                        "type": "sync_state",
                        "game": state
                    })

                    # Porteghal integration: report winner + update room status
                    if state.get("status") == "finished" and state.get("winner_id"):
                        try:
                            meta_key = f"room:{room_id}:meta"
                            raw = await redis_client.get(meta_key)
                            if raw:
                                meta = __import__("json").loads(raw)
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
                    sender_name = message.get("playerName", playerName)
                    if chat_text:
                        await room_manager.broadcast(room_id, {
                            "type": "chat",
                            "player_id": playerId,
                            "player_name": sender_name,
                            "message": chat_text,
                        })
                        
            except json.JSONDecodeError:
                # Handle malformed client JSON without dropping the connection
                await websocket.send_json({
                    "type": "error",
                    "message": "Malformed JSON payload received"
                })
            except ValueError as e:
                # Handle logical errors gracefully
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
            except Exception as e:
                # Fallback for any other unexpected logic-level exception
                await websocket.send_json({
                    "type": "error",
                    "message": f"An unexpected error occurred: {str(e)}"
                })

    except WebSocketDisconnect:
        # Player intentionally closed the connection or dropped off physically
        room_manager.disconnect(room_id, playerId)
        # Start the 60-second forfeit countdown background task
        room_manager.start_disconnect_timer(room_id, playerId, forfeit_active_player)
        
    except Exception:
        # Handle transport layer connection drops gracefully
        room_manager.disconnect(room_id, playerId)
        room_manager.start_disconnect_timer(room_id, playerId, forfeit_active_player)