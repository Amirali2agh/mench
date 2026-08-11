import json
import uuid
from app.redis_client import redis_client
from app.utils.redis_keys import RedisKeys

class QueueService:
    """
    Service to handle matchmaking queue operations using Redis.
    Supports dynamic matchmaking based on both player count and piece count.
    """

    @staticmethod
    async def add_to_queue(player_id: str, player_name: str, avatar_url: str, target_players: int, pieces_count: int) -> dict | None:
        """
        Adds a player to the matchmaking queue and metadata store.
        If enough players are present, creates a room and returns the room details.
        """
        # Store player metadata in Redis (expires after 1 hour to prevent clutter)
        player_meta_key = f"player:{player_id}:meta"
        meta_data = {
            "id": player_id,
            "name": player_name,
            "avatar": avatar_url
        }
        await redis_client.set(player_meta_key, json.dumps(meta_data), ex=3600)

        # Retrieve the dynamic queue key using both player and piece counts
        queue_key = RedisKeys.matchmaking_queue(target_players, pieces_count)
        
        # Check if player is already in queue to avoid duplicates
        queue_players = await redis_client.lrange(queue_key, 0, -1)
        if player_id not in queue_players:
            await redis_client.rpush(queue_key, player_id)

        # Check if we have enough players to match and create a game
        queue_length = await redis_client.llen(queue_key)
        if queue_length >= target_players:
            matched_ids = []
            for _ in range(target_players):
                pid = await redis_client.lpop(queue_key)
                if pid:
                    matched_ids.append(pid)
            
            # If successfully popped enough players, create a room
            if len(matched_ids) == target_players:
                room_id = str(uuid.uuid4())
                players_with_meta = []
                
                # Store the pieces count configured for this room in Redis
                # This will be fetched when initializing the game in the room websocket
                await redis_client.set(f"room:{room_id}:pieces_count", pieces_count, ex=3600)
                
                for pid in matched_ids:
                    # Map player to this room ID
                    await redis_client.set(RedisKeys.player_room(pid), room_id)
                    
                    # Fetch metadata for the players
                    p_meta = await redis_client.get(f"player:{pid}:meta")
                    if p_meta:
                        players_with_meta.append(json.loads(p_meta))
                    else:
                        players_with_meta.append({"id": pid, "name": f"Player {pid}", "avatar": ""})
                
                return {
                    "room_id": room_id,
                    "players": players_with_meta,
                    "pieces_count": pieces_count
                }
            
            # Recovery: if we popped but couldn't form the room, push them back
            for pid in matched_ids:
                await redis_client.lpush(queue_key, pid)

        return None

    @staticmethod
    async def remove_from_queue(player_id: str, target_players: int, pieces_count: int) -> None:
        """
        Removes a player from the queue when they disconnect or cancel.
        """
        queue_key = RedisKeys.matchmaking_queue(target_players, pieces_count)
        await redis_client.lrem(queue_key, 0, player_id)