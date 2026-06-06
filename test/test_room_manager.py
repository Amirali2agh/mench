import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from app.managers.room_manager import RoomManager

@pytest.mark.asyncio
async def test_room_manager_connect():
    """
    Test that a player can connect and register in the room.
    """
    manager = RoomManager()
    mock_ws = AsyncMock()
    
    await manager.connect("room1", "player1", mock_ws)
    
    mock_ws.accept.assert_called_once()
    assert "room1" in manager.rooms
    assert manager.rooms["room1"]["player1"] == mock_ws


def test_room_manager_disconnect():
    """
    Test that disconnecting a player unregisters them from the active room dictionary.
    """
    manager = RoomManager()
    mock_ws = MagicMock()
    manager.rooms["room1"] = {"player1": mock_ws}
    
    manager.disconnect("room1", "player1")
    
    assert "room1" not in manager.rooms


@pytest.mark.asyncio
async def test_room_manager_broadcast():
    """
    Test that broadcast sends JSON to all active websockets in the room.
    """
    manager = RoomManager()
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    manager.rooms["room1"] = {"p1": ws1, "p2": ws2}
    
    payload = {"type": "test_msg"}
    await manager.broadcast("room1", payload)
    
    ws1.send_json.assert_called_once_with(payload)
    ws2.send_json.assert_called_once_with(payload)


@pytest.mark.asyncio
async def test_disconnect_forfeit_timer_trigger():
    """
    Test that the forfeit timer executes the callback after sleeping.
    """
    manager = RoomManager()
    mock_callback = AsyncMock()
    
    # Patch async_sleep local import inside room_manager.py.
    # This leaves the global asyncio.sleep completely untouched.
    with patch("app.managers.room_manager.async_sleep", return_value=None) as mock_sleep:
        manager.start_disconnect_timer("room1", "player1", mock_callback)
        
        # This will use the real unpatched asyncio.sleep, allowing the loop to yield control
        await asyncio.sleep(0.01) 
        
        mock_sleep.assert_called_once_with(60)
        mock_callback.assert_called_once_with("room1", "player1")


@pytest.mark.asyncio
async def test_disconnect_timer_cancel_on_reconnect():
    """
    Test that reconnecting a player cancels the active disconnect forfeit timer.
    """
    manager = RoomManager()
    mock_callback = AsyncMock()
    mock_ws = AsyncMock()
    
    # Patch async_sleep local import inside room_manager.py
    with patch("app.managers.room_manager.async_sleep", side_effect=asyncio.CancelledError):
        manager.start_disconnect_timer("room1", "player1", mock_callback)
        
        # Reconnect the player, which must cancel the forfeit timer
        await manager.connect("room1", "player1", mock_ws)
        
        # Check that the task is removed from active forfeit tasks and callback was not executed
        assert "room1" not in manager.disconnect_tasks
        mock_callback.assert_not_called()