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


def test_piece_cannot_move_into_the_center_goal():
    assert GameService._calculate_new_position(43, 1) == (False, 43)


def test_piece_can_move_to_the_last_colored_home_cell():
    assert GameService._calculate_new_position(42, 1) == (True, 43)


def test_home_cell_cannot_be_occupied_by_two_pieces():
    pieces = [40, 42, -1, -1]

    assert not GameService._is_home_position_available(pieces, 1, 40)
    assert GameService._is_home_position_available(pieces, 1, 43)


def test_blocked_home_cells_leave_no_valid_move():
    state = {"pieces": {"player": [42, 43, -1, -1]}}

    assert not GameService._player_has_valid_moves(state, "player", 2)


def test_center_position_is_not_a_valid_follow_up_move():
    state = {"pieces": {"player": [44, 44, -1, -1]}}

    assert not GameService._player_has_valid_moves(state, "player", 2)
