import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.api.websocket.room import router

api_app = FastAPI()
api_app.include_router(router)

@pytest.mark.asyncio
async def test_websocket_room_connection_and_sync():
    """
    Test that joining a room triggers a sync_state message.
    """
    with patch("app.api.websocket.room.GameService", new_callable=AsyncMock) as mock_game, \
         patch("app.api.websocket.room.room_manager", new_callable=AsyncMock) as mock_manager:
        
        # Mocking an existing game state
        mock_game.get_game.return_value = {
            "room_id": "room1",
            "players": [{"id": "p1", "name": "Amir"}],
            "status": "playing"
        }
        
        client = TestClient(api_app)
        with client.websocket_connect("/ws/room/room1?playerId=p1") as websocket:
            # Receive initial sync_state
            data = websocket.receive_json()
            assert data["type"] == "sync_state"
            assert data["game"]["room_id"] == "room1"

        # Verify registration in room_manager
        mock_manager.connect.assert_called_once()


@pytest.mark.asyncio
async def test_websocket_room_roll_dice_action():
    """
    Test that sending a roll_dice action calls the GameService and broadcasts.
    """
    with patch("app.api.websocket.room.GameService", new_callable=AsyncMock) as mock_game, \
         patch("app.api.websocket.room.room_manager", new_callable=AsyncMock) as mock_manager:
        
        mock_game.get_game.return_value = {"room_id": "room1", "status": "playing"}
        mock_game.roll_dice.return_value = {"room_id": "room1", "dice": 6}
        
        client = TestClient(api_app)
        with client.websocket_connect("/ws/room/room1?playerId=p1") as websocket:
            # Ignore initial sync
            websocket.receive_json()
            
            # Send roll_dice action
            websocket.send_json({"action": "roll_dice"})
            
        mock_game.roll_dice.assert_called_once_with("room1", "p1")
        mock_manager.broadcast.assert_called()