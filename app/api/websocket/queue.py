from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.managers.queue_manager import queue_manager
from app.services.queue_service import QueueService

router = APIRouter()

@router.websocket("/ws/queue")
async def websocket_queue_endpoint(
    websocket: WebSocket,
    playerId: str = Query(...),
    playerName: str = Query(...),
    playerAvatarUrl: str = Query(""),
    playerCount: int = Query(2),        # Target players for matchmaking (2 or 4)
    piecesCount: int = Query(4)        # Selected Mensch pieces to play with (2, 3, or 4)
):
    """
    WebSocket endpoint for matchmaking. Connects players, registers their metadata,
    and broadcasts "match_found" when a lobby of matched player and piece count is filled.
    """
    # Accept and register connection in the active connection pool
    await queue_manager.connect(playerId, websocket)
    
    try:
        # Add player to Redis queue and check for matches using both counts
        match_result = await QueueService.add_to_queue(
            player_id=playerId,
            player_name=playerName,
            avatar_url=playerAvatarUrl,
            target_players=playerCount,
            pieces_count=piecesCount
        )
        
        # If a match is found, broadcast it to all involved players
        if match_result:
            room_id = match_result["room_id"]
            players = match_result["players"]
            
            for player in players:
                pid = player["id"]
                await queue_manager.send_match_found(pid, room_id, players)
        
        # Keep the connection alive while the player waits in the queue
        while True:
            # Listening for dummy/ping messages or simple client disconnect
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        # Cleanup when client disconnects gracefully
        queue_manager.disconnect(playerId)
        await QueueService.remove_from_queue(playerId, playerCount, piecesCount)
        
    except Exception:
        # Catch-all to ensure proper cleanup on any socket or connection errors
        queue_manager.disconnect(playerId)
        await QueueService.remove_from_queue(playerId, playerCount, piecesCount)