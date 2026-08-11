import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from app.redis_client import redis_client
from app.services.game_service import GameService
from app.managers.room_manager import room_manager

router = APIRouter(prefix="/api/dev")


class PlacePieceRequest(BaseModel):
    player_id: str
    piece_index: int
    position: int = 0


def _ensure_dev_mode() -> None:
    if not settings.DEBUG:
        raise HTTPException(status_code=403, detail="Dev endpoints are disabled")


async def _get_state(room_id: str) -> dict:
    state = await GameService.get_game(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="Room not found")
    return state


@router.get("/room/{room_id}")
async def get_room_state(room_id: str):
    _ensure_dev_mode()
    state = await _get_state(room_id)
    return state


@router.post("/room/{room_id}/place")
async def place_piece(room_id: str, req: PlacePieceRequest):
    _ensure_dev_mode()
    state = await _get_state(room_id)

    pieces = state.get("pieces", {})
    if req.player_id not in pieces:
        raise HTTPException(status_code=400, detail="Player not found in this room")

    pieces_count = state.get("pieces_count", 4)
    if req.piece_index < 0 or req.piece_index >= pieces_count:
        raise HTTPException(status_code=400, detail="Invalid piece_index")

    if req.position < -1 or req.position > 44:
        raise HTTPException(status_code=400, detail="position must be between -1 and 44")

    pieces[req.player_id][req.piece_index] = req.position
    state["pieces"] = pieces

    await GameService.save_game(room_id, state)
    await room_manager.broadcast(room_id, {
        "type": "sync_state",
        "game": state
    })
    return state
