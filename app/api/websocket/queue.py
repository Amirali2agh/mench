import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.managers.queue_manager import queue_manager
from app.services.queue_service import QueueService
from app.redis_client import redis_client
from app.utils.redis_keys import RedisKeys

router = APIRouter()


async def _wait_for_match(websocket: WebSocket, player_id: str) -> None:
    """Deliver match notifications from Redis even when workers differ."""
    while True:
        room_id = await redis_client.get(RedisKeys.player_room(player_id))
        if room_id:
            raw_meta = await redis_client.get(f"room:{room_id}:meta")
            if raw_meta:
                room_meta = json.loads(raw_meta)
                players = [
                    player
                    for player in room_meta.get("players_meta", {}).values()
                    if player.get("id")
                ]
                await websocket.send_json({
                    "type": "match_found",
                    "room_id": room_id,
                    "players": players,
                })
                return
        await asyncio.sleep(0.25)


@router.websocket("/ws/queue")
async def websocket_queue_endpoint(
    websocket: WebSocket,
    playerId: str = Query(...),
    playerName: str = Query(...),
    playerAvatarUrl: str = Query(""),
    playerCount: int = Query(2),
    piecesCount: int = Query(4),
):
    """Redis-backed matchmaking with worker-independent match delivery."""
    await queue_manager.connect(playerId, websocket)
    match_watch_task = None

    try:
        match_result = await QueueService.add_to_queue(
            player_id=playerId,
            player_name=playerName,
            avatar_url=playerAvatarUrl,
            target_players=playerCount,
            pieces_count=piecesCount,
        )

        if match_result:
            # This connection created the match. Other matched players keep a
            # Redis watcher, so we only need to notify the current connection
            # directly. This avoids duplicate match_found messages.
            await queue_manager.send_match_found(
                playerId,
                match_result["room_id"],
                match_result["players"],
            )
        else:
            # The first player may be connected to a different worker from the
            # player that completes the match. Redis polling closes that gap.
            match_watch_task = asyncio.create_task(
                _wait_for_match(websocket, playerId)
            )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        queue_manager.disconnect(playerId)
        await QueueService.remove_from_queue(
            playerId, playerCount, piecesCount
        )
    except Exception:
        queue_manager.disconnect(playerId)
        await QueueService.remove_from_queue(
            playerId, playerCount, piecesCount
        )
    finally:
        if match_watch_task:
            match_watch_task.cancel()
            try:
                await match_watch_task
            except asyncio.CancelledError:
                pass
