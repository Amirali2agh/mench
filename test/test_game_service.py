from app.services.game_service import GameService


def test_rotate_turn_uses_requested_four_player_order():
    state = {
        "player_count": 4,
        "players": [{"id": str(index)} for index in range(4)],
        "current_turn": 0,
        "dice_rolled": True,
        "consecutive_sixes": 2,
    }

    order = []
    for _ in range(4):
        order.append(state["current_turn"])
        GameService._rotate_turn(state)

    assert order == [0, 3, 1, 2]
    assert state["current_turn"] == 0


def test_rotate_turn_keeps_sequential_order_for_two_players():
    state = {
        "player_count": 2,
        "players": [{"id": "0"}, {"id": "1"}],
        "current_turn": 0,
        "dice_rolled": True,
        "consecutive_sixes": 2,
    }

    GameService._rotate_turn(state)

    assert state["current_turn"] == 1
