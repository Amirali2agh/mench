# Mensch Game - Backend Integration & Architecture Guide

This document defines the WebSocket communication protocols, query parameters, events, and data schemas required for the Frontend developer to integrate the React + TypeScript application with this FastAPI + Redis backend.

---

## 1. Running the Backend Service

To run the backend and its Redis database locally using Docker, execute this command in the project root:
```bash
docker compose up --build

API Base URL: http://localhost:8000
WS Base URL: ws://localhost:8000
Health Check Endpoint: http://localhost:8000/health (Returns database connection health status).


2. Matchmaking Queue Connection (/ws/queue)

o enter the matchmaking queue, connect to the following WebSocket endpoint.
WebSocket URL:
ws://localhost:8000/ws/queue

Connection Query Parameters:
Param	Type	Required	Default	Purpose
playerId	string	Yes	-	Unique identifier of the current player.
playerName	string	Yes	-	Display name of the player (supports Persian characters).
playerAvatarUrl	string	No	""	URL to the player's profile avatar.
playerCount	int	No	2	Matchmaking queue capacity. Accepts 2 or 4 players.
piecesCount	int	No	4	Number of Mensch pieces to play with. Accepts 2, 3, or 4.
Match Found Event (Broadcasted by Server):
When the queue reaches the required capacity (based on playerCount and piecesCount), the server automatically groups the players, maps them to a newly created room, and broadcasts this payload to all matched players:
code
JSON
{
  "type": "match_found",
  "room_id": "a9b8c7d6-e5f4-3210-9876-543210fedcba",
  "players": [
    {
      "id": "p1",
      "name": "علی",
      "avatar": "https://example.com/avatar1.png"
    },
    {
      "id": "p2",
      "name": "رضا",
      "avatar": "https://example.com/avatar2.png"
    }
  ],
  "pieces_count": 4
}
Action Required by Frontend: Upon receiving this message, the frontend must immediately close the queue WebSocket connection and redirect the user to the active game room WebSocket.
3. Game Room Connection (/ws/room/{room_id})
To play the active game, connect to the room WebSocket endpoint.
WebSocket URL:
ws://localhost:8000/ws/room/{room_id}
Connection Query Parameters:
Param	Type	Required	Purpose
playerId	string	Yes	Unique identifier of the current player.
playerName	string	Yes	Display name of the player.
Initial Connection Sync:
As soon as any player connects, the server broadcasts the current active game board state to all connected clients inside the room:
code
JSON
{
  "type": "sync_state",
  "game": {
    "room_id": "test-room-uuid",
    "player_count": 2,
    "pieces_count": 4,
    "players": [
      {"id": "p1", "name": "علی", "avatar": "https://..."},
      {"id": "p2", "name": "رضا", "avatar": "https://..."}
    ],
    "current_turn": 0,
    "dice": null,
    "dice_rolled": false,
    "pieces": {
      "p1": [-1, -1, -1, -1],
      "p2": [-1, -1, -1, -1]
    },
    "status": "playing",
    "winner_id": null
  }
}
4. Gameplay Actions (Client to Server)
The client sends these stringified JSON actions to execute moves:
4.1 Roll Dice
To roll the dice on your turn:
code
JSON
{
  "action": "roll_dice"
}
4.2 Move Piece
To move a specific piece after rolling the dice. piece_index represents the index of the piece (from 0 to pieces_count - 1):
code
JSON
{
  "action": "move_piece",
  "piece_index": 0
}
4.3 Next Round
To restart the board but preserve player scores/stats (useful after a match completes):
code
JSON
{
  "action": "next_round"
}
4.4 Restart Game
To completely clear and restart the session:
code
JSON
{
  "action": "restart_game"
}
5. Board Grid Mapping & Movement Specs
To map the relative coordinates sent by the server to the physical visual board:
Starting Base/Yard: -1 (Requires rolling a 6 to move to position 0).
Main circular Track: Positions 0 to 39 (Total 40 spaces shared by all players).
Home Column: Private path represented by positions 40, 41, 42, and 43.
Destination Goal State: Position 44 (The piece has finished the game).
Starting Absolute Offsets on the Circular Grid:
For 2 Players: Player 0 starts at absolute index 0, Player 1 starts at absolute index 20.
For 4 Players: Player 0 index 0, Player 1 index 10, Player 2 index 20, Player 3 index 30.
6. Disconnect Forfeit System (The 60-Second Rule)
If any player disconnects (due to network failure, app closing, etc.), the server triggers an asynchronous 60-second countdown forfeit timer for that player.
Reconnection: If the player connects back to ws://localhost:8000/ws/room/{room_id} before the 60 seconds expire, the forfeit timer is canceled, and they resume playing.
Forfeit Trigger: If the timer reaches 60 seconds, the server terminates the game, marks status as "finished", sets the remaining online opponent as winner_id, and broadcasts the final sync_state.
code
Code
---
