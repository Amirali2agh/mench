import json
import random
import asyncio
from app.redis_client import redis_client
from app.utils.redis_keys import RedisKeys

class GameService:
    """
    Core game engine service managing Mensch (Ludo) board logic,
    piece movements, dice rolling, capturing, and turn propagation.
    Supports dynamic piece counts per player.
    """

    @staticmethod
    async def create_game(room_id: str, players: list[dict], pieces_count: int = 4, player_count: int | None = None) -> dict:
        if player_count is None:
            player_count = len(players)

        pieces = {p["id"]: [-1] * pieces_count for p in players}

        state = {
            "room_id": room_id,
            "player_count": player_count,
            "pieces_count": pieces_count,
            "players": players,
            "current_turn": 0,
            "dice": None,
            "dice_rolled": False,
            "consecutive_sixes": 0,
            "pieces": pieces,
            "status": "playing",
            "winner_id": None,
            "last_roll": None
        }

        await GameService.save_game(room_id, state)
        return state

    @staticmethod
    async def get_game(room_id: str) -> dict | None:
        data = await redis_client.get(RedisKeys.room_state(room_id))
        if data:
            return json.loads(data)
        return None

    @staticmethod
    async def save_game(room_id: str, state: dict) -> None:
        await redis_client.set(RedisKeys.room_state(room_id), json.dumps(state), ex=7200)

    @staticmethod
    async def roll_dice(room_id: str, player_id: str) -> dict:
        state = await GameService.get_game(room_id)
        if not state or state["status"] == "finished":
            raise ValueError("Game not active")

        active_player_idx = state["current_turn"]
        active_player = state["players"][active_player_idx]

        if active_player["id"] != player_id:
            raise ValueError("Not your turn")

        if state["dice_rolled"]:
            raise ValueError("Dice already rolled")

        # تولید عدد تاس
        rolled = random.randint(1, 6)
        state["dice"] = rolled
        state["last_roll"] = {
            "player_id": player_id,
            "value": rolled
        }
        state["dice_rolled"] = True

        # بررسی قانون ۳ بار تاس ۶ پیاپی (سوختن نوبت)
        if rolled == 6:
            consecutive = state.get("consecutive_sixes", 0) + 1
            state["consecutive_sixes"] = consecutive
            
            if consecutive == 3:
                # نوبت می‌سوزد، اما ابتدا تاس را نشان می‌دهیم سپس نوبت را عوض می‌کنیم
                return await GameService._animate_and_pass_turn(room_id, state)
        else:
            state["consecutive_sixes"] = 0

        # بررسی اینکه آیا بازیکن اصلاً حرکت مجازی دارد یا خیر؟
        has_moves = GameService._player_has_valid_moves(state, player_id, rolled)

        if not has_moves:
            # بازیکن گیر کرده است! انتقال خودکار نوبت با تأخیر انیمیشن
            return await GameService._animate_and_pass_turn(room_id, state)

        # اگر حرکت مجاز داشت، فقط وضعیت را ذخیره می‌کنیم تا خودش مهره را تکان دهد
        await GameService.save_game(room_id, state)
        return state

    @staticmethod
    async def _animate_and_pass_turn(room_id: str, state: dict) -> dict:
        """
        متد کمکی حرفه‌ای: وضعیت تاس را به همه می‌فرستد، ۱.۵ ثانیه صبر می‌کند تا 
        انیمیشن در فرانت‌اند تمام شود، سپس نوبت را به نفر بعدی پاس می‌دهد.
        """
        # ایمپورت محلی برای جلوگیری از Circular Import
        try:
            from app.managers.room_manager import room_manager
        except ImportError:
            room_manager = None

        # ۱. ذخیره و ارسال وضعیت فعلی (برای نمایش عدد تاس به همه بازیکنان)
        await GameService.save_game(room_id, state)
        if room_manager and hasattr(room_manager, 'broadcast_to_room'):
            await room_manager.broadcast_to_room(room_id, {"type": "sync_state", "game": state})
        
        # ۲. مکث برای پخش انیمیشن تاس در فرانت‌اند
        await asyncio.sleep(1.5)
        
        # ۳. تغییر نوبت و ریست کردن وضعیت تاس
        state = GameService._rotate_turn(state)
        await GameService.save_game(room_id, state)
        
        # روتر وب‌سوکت (room.py) این وضعیت جدید را دوباره به همه برودکست خواهد کرد
        return state

    @staticmethod
    async def move_piece(room_id: str, player_id: str, piece_index: int) -> dict:
        state = await GameService.get_game(room_id)
        if not state or state["status"] == "finished":
            raise ValueError("Game not active")

        active_player_idx = state["current_turn"]
        active_player = state["players"][active_player_idx]

        if active_player["id"] != player_id:
            raise ValueError("Not your turn")

        if not state["dice_rolled"]:
            raise ValueError("Must roll dice first")

        pieces_count = state.get("pieces_count", 4)
        if piece_index < 0 or piece_index >= pieces_count:
            raise ValueError("Invalid piece index")

        dice = state["dice"]
        player_pieces = state["pieces"][player_id]
        current_pos = player_pieces[piece_index]

        is_valid, new_pos = GameService._calculate_new_position(current_pos, dice)
        if not is_valid:
            raise ValueError("Invalid move selection")

        player_pieces[piece_index] = new_pos

        captured = False
        if 0 <= new_pos <= 39:
            captured = GameService._handle_captures(state, player_id, new_pos)

        if all(pos == 44 for pos in player_pieces):
            state["status"] = "finished"
            state["winner_id"] = player_id
        else:
            if dice == 6 or captured:
                state["dice"] = None
                state["dice_rolled"] = False
            else:
                state = GameService._rotate_turn(state)

        await GameService.save_game(room_id, state)
        return state

    @staticmethod
    def _player_has_valid_moves(state: dict, player_id: str, dice: int) -> bool:
        pieces = state["pieces"][player_id]
        for pos in pieces:
            is_valid, _ = GameService._calculate_new_position(pos, dice)
            if is_valid:
                return True
        return False

    @staticmethod
    def _calculate_new_position(current_pos: int, dice: int) -> tuple[bool, int]:
        if current_pos == -1:
            if dice == 6:
                return True, 0
            return False, -1

        new_pos = current_pos + dice
        if new_pos <= 44:
            return True, new_pos

        return False, current_pos

    @staticmethod
    def _handle_captures(state: dict, moving_player_id: str, relative_pos: int) -> bool:
        player_count = state["player_count"]
        players = state["players"]
        player_ids = [p["id"] for p in players]

        moving_idx = player_ids.index(moving_player_id)
        moving_offset = (40 // player_count) * moving_idx
        moving_abs = (moving_offset + relative_pos) % 40
        
        captured_any = False

        for idx, pid in enumerate(player_ids):
            if pid == moving_player_id:
                continue

            opponent_offset = (40 // player_count) * idx
            opponent_pieces = state["pieces"][pid]

            for piece_idx, opp_rel_pos in enumerate(opponent_pieces):
                if 0 <= opp_rel_pos <= 39:
                    opp_abs = (opponent_offset + opp_rel_pos) % 40
                    if moving_abs == opp_abs:
                        opponent_pieces[piece_idx] = -1
                        captured_any = True

        return captured_any

    @staticmethod
    def _rotate_turn(state: dict) -> dict:
        joined_count = len(state["players"])
        if joined_count > 0:
            state["current_turn"] = (state["current_turn"] + 1) % joined_count
        
        state["dice_rolled"] = False
        state["consecutive_sixes"] = 0
        return state