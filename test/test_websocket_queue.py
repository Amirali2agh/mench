import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.api.websocket.queue import router
from app.managers.queue_manager import queue_manager

# Setup a dummy FastAPI app named api_app (renamed from test_app to suppress pytest warning)
api_app = FastAPI()
api_app.include_router(router)

def test_websocket_queue_flow():
    """
    Test the entire WebSocket matchmaking loop: connection, metadata caching,
    matching and automatic cleanup on disconnect with dynamic pieces count.
    """
    # Patch QueueService (Redis operations) and only mock queue_manager.send_match_found.
    # We must allow the real queue_manager.connect to run so it can call websocket.accept() 
    # and prevent the TestClient from hanging indefinitely.
    with patch("app.api.websocket.queue.QueueService", new_callable=AsyncMock) as mock_service, \
         patch.object(queue_manager, "send_match_found", new_callable=AsyncMock) as mock_send_match:
        
        # Mock matched results returned by the queue service
        mock_service.add_to_queue.return_value = {
            "room_id": "test-room-uuid",
            "players": [
                {"id": "p1", "name": "Amir", "avatar": ""},
                {"id": "p2", "name": "Ali", "avatar": ""}
            ],
            "pieces_count": 3
        }
        
        client = TestClient(api_app)
        
        # Act: Open a simulated WebSocket connection with target playerCount and piecesCount query params
        with client.websocket_connect("/ws/queue?playerId=p1&playerName=Amir&playerAvatarUrl=http://avatar&playerCount=2&piecesCount=3") as websocket:
            # The context manager automatically closes the socket upon block exit
            pass
        
        # Assert: Verify correct parameters (including pieces_count=3) were forwarded to the queue service
        mock_service.add_to_queue.assert_called_once_with(
            player_id="p1",
            player_name="Amir",
            avatar_url="http://avatar",
            target_players=2,
            pieces_count=3
        )
        
        # Assert: Verify match notifications were sent out to both matched players
        assert mock_send_match.call_count == 2
        mock_send_match.assert_any_call("p1", "test-room-uuid", mock_service.add_to_queue.return_value["players"])
        mock_send_match.assert_any_call("p2", "test-room-uuid", mock_service.add_to_queue.return_value["players"])
        
        # Assert: Verify automatic cleanup is triggered on connection drop with the correct piece count
        mock_service.remove_from_queue.assert_called_once_with("p1", 2, 3)
        # Check that player is correctly removed from the active in-memory connections dict
        assert "p1" not in queue_manager.active_connections