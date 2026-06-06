import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.managers.room_manager import room_manager
from app.services.game_service import GameService
from app.redis_client import redis_client

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
            
            # Since the state does not exist yet, we initialize it using the connected lobby metadata
            # We fetch player names/metadata dynamically to propagate back in sync_state
            # (Matches requirement #3 & #9: propagating playerName & playerAvatarUrl)
            player_meta = await redis_client.get(f"player:{playerId}:meta")
            meta_dict = json.loads(player_meta) if player_meta else {"id": playerId, "name": playerName, "avatar": ""}
            
            # Initialize with default placeholders for missing metadata during manual room connects
            initial_players = [meta_dict]
            state = await GameService.create_game(room_id, initial_players, pieces_count)
        else:
            # If state already exists but connecting player is missing from players list (e.g. late joiner)
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
                    continue
                state = await GameService.move_piece(room_id, playerId, int(piece_index))
                await room_manager.broadcast(room_id, {
                    "type": "sync_state",
                    "game": state
                })
                
            # Action 3: Reset pieces for next round but keep session/players intact (Requirement #7)
            elif action == "next_round":
                state = await GameService.get_game(room_id)
                if state:
                    # Re-initialize pieces back to yard while keeping scores/player lists
                    state = await GameService.create_game(room_id, state["players"], state["pieces_count"])
                    await room_manager.broadcast(room_id, {
                        "type": "sync_state",
                        "game": state
                    })
                    
            # Action 4: Completely restart and clear the game (Requirement #7)
            elif action == "restart_game":
                state = await GameService.get_game(room_id)
                if state:
                    state = await GameService.create_game(room_id, state["players"], state["pieces_count"])
                    await room_manager.broadcast(room_id, {
                        "type": "sync_state",
                        "game": state
                    })

    except WebSocketDisconnect:
        # Player closed connection or disconnected
        room_manager.disconnect(room_id, playerId)
        # Start the 60-second forfeit countdown background task (Requirement #8)
        room_manager.start_disconnect_timer(room_id, playerId, forfeit_active_player)
        
    except Exception:
        # Handle connection errors gracefully
        room_manager.disconnect(room_id, playerId)
        room_manager.start_disconnect_timer(room_id, playerId, forfeit_active_player)