import json
import random
from app.redis_client import redis_client
from app.utils.redis_keys import RedisKeys

# Starting absolute positions on the 40-space main track for 2 and 4 player configurations
START_OFFSETS = {
    2: [0, 20],
    4: [0, 10, 20, 30]
}

class GameService:
    """
    Core game engine service managing Mensch (Ludo) board logic, 
    piece movements, dice rolling, capturing, and turn propagation.
    Supports dynamic piece counts per player.
    """

    @staticmethod
    async def create_game(room_id: str, players: list[dict], pieces_count: int = 4) -> dict:
        """
        Initializes a new game session state in Redis with a dynamic piece count.
        """
        player_count = len(players)
        # Dynamically allocate [-1] for each piece requested by the lobby configuration
        pieces = {p["id"]: [-1] * pieces_count for p in players}
        
        state = {
            "room_id": room_id,
            "player_count": player_count,
            "pieces_count": pieces_count,  # Storing pieces count in state
            "players": players,
            "current_turn": 0,  # Index of player in the players list
            "dice": None,
            "dice_rolled": False,
            "pieces": pieces,
            "status": "playing",  # playing, finished
            "winner_id": None
        }
        
        await GameService.save_game(room_id, state)
        return state

    @staticmethod
    async def get_game(room_id: str) -> dict | None:
        """
        Retrieves the active game state from Redis.
        """
        data = await redis_client.get(RedisKeys.room_state(room_id))
        if data:
            return json.loads(data)
        return None

    @staticmethod
    async def save_game(room_id: str, state: dict) -> None:
        """
        Saves the game state back to Redis with a 2-hour expiration.
        """
        await redis_client.set(RedisKeys.room_state(room_id), json.dumps(state), ex=7200)

    @staticmethod
    async def roll_dice(room_id: str, player_id: str) -> dict:
        """
        Rolls a 6-sided dice for the active player.
        """
        state = await GameService.get_game(room_id)
        if not state or state["status"] == "finished":
            raise ValueError("Game not active")
        
        active_player_idx = state["current_turn"]
        active_player = state["players"][active_player_idx]
        
        if active_player["id"] != player_id:
            raise ValueError("Not your turn")
        
        if state["dice_rolled"]:
            raise ValueError("Dice already rolled")
        
        # Roll 1 to 6
        rolled = random.randint(1, 6)
        state["dice"] = rolled
        
        # Save the last roll information so the frontend can always animate it,
        # even after the active turn rotates and clears the "dice" field.
        state["last_roll"] = {
            "player_id": player_id,
            "value": rolled
        }

        # Helper to check if player has any valid moves
        has_moves = GameService._player_has_valid_moves(state, player_id, rolled)
        
        # If no moves are possible, turn immediately rotates to the next player
        if not has_moves:
            state = GameService._rotate_turn(state)
            
        await GameService.save_game(room_id, state)
        return state

    @staticmethod
    async def move_piece(room_id: str, player_id: str, piece_index: int) -> dict:
        """
        Moves a selected piece for the active player based on the rolled dice.
        """
        state = await GameService.get_game(room_id)
        if not state or state["status"] == "finished":
            raise ValueError("Game not active")
        
        active_player_idx = state["current_turn"]
        active_player = state["players"][active_player_idx]
        
        if active_player["id"] != player_id:
            raise ValueError("Not your turn")
        
        if not state["dice_rolled"]:
            raise ValueError("Must roll dice first")
        
        dice = state["dice"]
        player_pieces = state["pieces"][player_id]
        current_pos = player_pieces[piece_index]
        
        # Validate and calculate new relative position
        is_valid, new_pos = GameService._calculate_new_position(current_pos, dice)
        if not is_valid:
            raise ValueError("Invalid move selection")
            
        # Apply the move
        player_pieces[piece_index] = new_pos
        
        # Check for captures on the main common track (positions 0 to 39)
        captured = False
        if 0 <= new_pos <= 39:
            captured = GameService._handle_captures(state, player_id, new_pos)
            
        # Check if the moving player won the game (all pieces at position 44)
        if all(pos == 44 for pos in player_pieces):
            state["status"] = "finished"
            state["winner_id"] = player_id
        else:
            # If 6 rolled or opponent captured, player gets another turn. Otherwise, rotate.
            if dice == 6 or captured:
                state["dice"] = None
                state["dice_rolled"] = False
            else:
                state = GameService._rotate_turn(state)
                # Ensure piece_index is converted to an integer to prevent TypeError crashes
        try:
            piece_index = int(piece_index)
        except (ValueError, TypeError):
            raise ValueError("Invalid piece index format")
                
        await GameService.save_game(room_id, state)

        return state

    @staticmethod
    def _player_has_valid_moves(state: dict, player_id: str, dice: int) -> bool:
        """
        Check if the player has at least one valid move with the current dice.
        """
        pieces = state["pieces"][player_id]
        for pos in pieces:
            is_valid, _ = GameService._calculate_new_position(pos, dice)
            if is_valid:
                return True
        return False

    @staticmethod
    def _calculate_new_position(current_pos: int, dice: int) -> tuple[bool, int]:
        """
        Calculates and validates piece movement.
        Returns (is_valid, new_position).
        """
        # -1 represents starting yard/base
        if current_pos == -1:
            if dice == 6:
                return True, 0  # Enter track at relative position 0
            return False, -1
            
        # Rel positions: 0 to 39 are on main shared track (40 spaces)
        # Rel positions: 40 to 43 are the player's private goal zone (4 spaces)
        # Rel position: 44 is the finished state
        new_pos = current_pos + dice
        if new_pos <= 44:
            return True, new_pos
            
        return False, current_pos

    @staticmethod
    def _handle_captures(state: dict, moving_player_id: str, relative_pos: int) -> bool:
        """
        Scans for opponent pieces occupying the same physical space and sends them to yard.
        """
        player_count = state["player_count"]
        players = state["players"]
        player_ids = [p["id"] for p in players]
        
        moving_idx = player_ids.index(moving_player_id)
        moving_offset = START_OFFSETS[player_count][moving_idx]
        
        # Absolute track position of the moving piece
        moving_abs = (moving_offset + relative_pos) % 40
        captured_any = False
        
        for idx, pid in enumerate(player_ids):
            if pid == moving_player_id:
                continue
                
            opponent_offset = START_OFFSETS[player_count][idx]
            opponent_pieces = state["pieces"][pid]
            
            for piece_idx, opp_rel_pos in enumerate(opponent_pieces):
                # Only check pieces that are currently on the shared track (0 to 39)
                if 0 <= opp_rel_pos <= 39:
                    opp_abs = (opponent_offset + opp_rel_pos) % 40
                    if moving_abs == opp_abs:
                        opponent_pieces[piece_idx] = -1  # Send back to yard
                        captured_any = True
                        
        return captured_any

    @staticmethod
    def _rotate_turn(state: dict) -> dict:
        """
        Rotates the active turn to the next player in the lobby.
        """
        player_count = state["player_count"]
        state["current_turn"] = (state["current_turn"] + 1) % player_count
        state["dice"] = None
        state["dice_rolled"] = False
        return state