import json
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.redis_client import redis_client
from app.services.game_service import GameService

router = APIRouter(prefix="/api")


class CreateRoomRequest(BaseModel):
    room_id: str = ""
    player1_id: str = ""
    player1_name: str = ""
    player1_avatar: str = ""
    player2_id: str = ""
    player2_name: str = ""
    player2_avatar: str = ""
    player_count: int = 2
    pieces_count: int = 4
    coin_bet: int = 0


class RoomJoinResponse(BaseModel):
    room_id: str
    player1_id: str
    player1_name: str
    player1_avatar: str
    player2_id: str
    player2_name: str
    player2_avatar: str
    status: str
    coin_bet: int = 0


class JoinRoomRequest(BaseModel):
    player_id: str
    player_name: str = ""
    player_avatar: str = ""


def _room_meta_key(room_id: str) -> str:
    return f"room:{room_id}:meta"


@router.post("/rooms", response_model=RoomJoinResponse)
async def create_room(req: CreateRoomRequest):
    room_id = req.room_id or str(uuid.uuid4())[:8]

    # Store room settings used by the game
    await redis_client.set(f"room:{room_id}:pieces_count", str(req.pieces_count))
    await redis_client.set(f"room:{room_id}:player_count", str(req.player_count))

    # Store player meta
    if req.player1_id:
        meta1 = json.dumps({"id": req.player1_id, "name": req.player1_name, "avatar": req.player1_avatar})
        await redis_client.set(f"player:{req.player1_id}:meta", meta1)
    if req.player2_id:
        meta2 = json.dumps({"id": req.player2_id, "name": req.player2_name, "avatar": req.player2_avatar})
        await redis_client.set(f"player:{req.player2_id}:meta", meta2)

    room_data = {
        "room_id": room_id,
        "players": [req.player1_id, req.player2_id] if req.player2_id else [req.player1_id],
        "players_meta": {
            "1": {"id": req.player1_id, "name": req.player1_name, "avatar": req.player1_avatar},
            "2": {"id": req.player2_id, "name": req.player2_name, "avatar": req.player2_avatar},
        },
        "status": "playing" if req.player2_id else "waiting",
        "coin_bet": req.coin_bet,
    }
    await redis_client.set(_room_meta_key(room_id), json.dumps(room_data))

    # Pre-create game state if both players are provided (porteghal direct room mode)
    if req.player1_id and req.player2_id:
        p1_meta = {"id": req.player1_id, "name": req.player1_name, "avatar": req.player1_avatar}
        p2_meta = {"id": req.player2_id, "name": req.player2_name, "avatar": req.player2_avatar}
        await GameService.create_game_for_players(
            room_id, p1_meta, p2_meta,
            pieces_count=req.pieces_count,
            player_count=req.player_count,
            coin_bet=req.coin_bet,
        )

    return RoomJoinResponse(
        room_id=room_id,
        player1_id=req.player1_id,
        player1_name=req.player1_name or "بازیکن ۱",
        player1_avatar=req.player1_avatar,
        player2_id=req.player2_id,
        player2_name=req.player2_name or "",
        player2_avatar=req.player2_avatar,
        status=room_data["status"],
        coin_bet=req.coin_bet,
    )


@router.get("/rooms/{room_id}", response_model=RoomJoinResponse)
async def get_room(room_id: str):
    data = await redis_client.get(_room_meta_key(room_id))
    if not data:
        raise HTTPException(status_code=404, detail="Room not found")

    room = json.loads(data)
    meta = room.get("players_meta", {})
    p1 = meta.get("1", {})
    p2 = meta.get("2", {})

    return RoomJoinResponse(
        room_id=room_id,
        player1_id=p1.get("id", ""),
        player1_name=p1.get("name", "بازیکن ۱"),
        player1_avatar=p1.get("avatar", ""),
        player2_id=p2.get("id", ""),
        player2_name=p2.get("name", ""),
        player2_avatar=p2.get("avatar", ""),
        status=room.get("status", "waiting"),
        coin_bet=room.get("coin_bet", 0),
    )


@router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, req: JoinRoomRequest):
    data = await redis_client.get(_room_meta_key(room_id))
    if not data:
        raise HTTPException(status_code=404, detail="Room not found")

    room = json.loads(data)
    meta = room.get("players_meta", {})

    # Check if this player already in room
    for num, mp in meta.items():
        if mp.get("id") == req.player_id:
            return {"room_id": room_id, "player_num": int(num), "status": room.get("status")}

    # Assign to player 2 slot
    p2 = meta.get("2", {})
    if not p2.get("id"):
        meta["2"] = {"id": req.player_id, "name": req.player_name, "avatar": req.player_avatar}
        room["players"] = [meta["1"]["id"], req.player_id]
        room["status"] = "playing"
        await redis_client.set(_room_meta_key(room_id), json.dumps(room))
        # Also set player meta for the game
        await redis_client.set(f"player:{req.player_id}:meta", json.dumps(meta["2"]))

        # Pre-create game state now that both players are present
        p1_meta = meta["1"]
        p2_meta = meta["2"]
        pieces_count = int(room.get("pieces_count", 4))
        player_count = int(room.get("player_count", 2))
        await GameService.create_game_for_players(
            room_id, p1_meta, p2_meta,
            pieces_count=pieces_count,
            player_count=player_count,
            coin_bet=room.get("coin_bet", 0),
        )

        return {"room_id": room_id, "player_num": 2, "status": "playing"}

    raise HTTPException(status_code=400, detail="Room is full")
