from app.utils.redis_keys import RedisKeys

def test_matchmaking_queue_key():
    """
    Test that matchmaking queue keys format correctly for 2 and 4 players.
    """
    assert RedisKeys.matchmaking_queue(2) == "matchmaking:queue:2p"
    assert RedisKeys.matchmaking_queue(4) == "matchmaking:queue:4p"


def test_room_state_key():
    """
    Test that room state keys format correctly with given room ID.
    """
    assert RedisKeys.room_state("room123") == "room:room123:state"


def test_room_players_key():
    """
    Test that room players keys format correctly.
    """
    assert RedisKeys.room_players("room123") == "room:room123:players"


def test_player_room_key():
    """
    Test that player room mapping keys format correctly.
    """
    assert RedisKeys.player_room("user456") == "player:user456:room"


def test_player_disconnect_key():
    """
    Test that player disconnection keys format correctly.
    """
    assert RedisKeys.player_disconnect("user456") == "player:user456:disconnect_time"