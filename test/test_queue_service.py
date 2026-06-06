import pytest
import json
from unittest.mock import patch, AsyncMock
from app.services.queue_service import QueueService

@pytest.mark.asyncio
async def test_add_to_queue_not_enough_players():
    """
    Test that adding a player to queue stores metadata and pushes to list,
    but returns None if the matchmaking pool target is not met.
    """
    with patch("app.services.queue_service.redis_client", new_callable=AsyncMock) as mock_redis:
        mock_redis.lrange.return_value = []
        mock_redis.llen.return_value = 1
        
        result = await QueueService.add_to_queue(
            player_id="p1",
            player_name="Amir",
            avatar_url="http://avatar.com/1",
            target_players=2
        )
        
        assert result is None
        mock_redis.set.assert_any_call(
            "player:p1:meta",
            json.dumps({"id": "p1", "name": "Amir", "avatar": "http://avatar.com/1"}),
            ex=3600
        )
        mock_redis.rpush.assert_called_once_with("matchmaking:queue:2p", "p1")


@pytest.mark.asyncio
async def test_add_to_queue_triggers_match():
    """
    Test that adding a player to queue triggers a successful match 
    when the queue length reaches the target count.
    """
    with patch("app.services.queue_service.redis_client", new_callable=AsyncMock) as mock_redis:
        mock_redis.lrange.return_value = []
        mock_redis.llen.return_value = 2
        mock_redis.lpop.side_effect = ["p1", "p2"]
        mock_redis.get.side_effect = [
            json.dumps({"id": "p1", "name": "Amir", "avatar": "avatar1"}),
            json.dumps({"id": "p2", "name": "Ali", "avatar": "avatar2"})
        ]
        
        result = await QueueService.add_to_queue(
            player_id="p2",
            player_name="Ali",
            avatar_url="avatar2",
            target_players=2
        )
        
        assert result is not None
        assert "room_id" in result
        assert len(result["players"]) == 2
        assert result["players"][0]["id"] == "p1"
        assert result["players"][1]["id"] == "p2"


@pytest.mark.asyncio
async def test_remove_from_queue():
    """
    Test that removing a player from queue issues correct Redis LREM call.
    """
    with patch("app.services.queue_service.redis_client", new_callable=AsyncMock) as mock_redis:
        await QueueService.remove_from_queue("p1", 2)
        mock_redis.lrem.assert_called_once_with("matchmaking:queue:2p", 0, "p1")