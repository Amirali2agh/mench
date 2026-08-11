# Turn Order Issue in 3/4-Player Games

## Problem

In 2-player games the red and blue players sit diagonally across from each
other, so the turn order red -> blue is correct. In 3- and 4-player games the
turn order jumped diagonally across the board instead of rotating to the
adjacent seat. Desired 4-player order: clockwise around the board with no
diagonal jumps, with blue seated next to red.

## Root Cause

The backend rotates turns by player index (`current_turn`), while the frontend
decides where each index sits and which color it is. The two disagreed:

- The backend `_rotate_turn` originally used `(current_turn + 1) % player_count`,
  i.e. index order 0 -> 1 -> 2 -> 3.
- The frontend `getVisualIdx()` in `GameBoard.tsx` mapped backend indices to
  board corners with a swap for 4-player games (backend 2 rendered as yellow in
  the bottom-right, backend 3 as green in the top-left), so the on-screen order
  became red -> blue -> yellow -> green and diagonal.
- Additionally, the running Docker container (`mensch-backend`) was built from
  older source, so several fixes were never live on the tested server.

## Attempts

### Attempt 1 — turn order table in `_rotate_turn`

Changed `app/services/game_service.py` `_rotate_turn()` to use a `turn_order`
dict keyed by player count, assuming backend slots were laid out
red=0, blue=1, green=2, yellow=3:

```python
turn_order = {
    3: [0, 1, 2],
    4: [0, 3, 1, 2],
}
```

Result: still wrong. The backend's assumption about which index is which color
did not match the frontend `getVisualIdx()` swap (backend 2 = yellow on screen,
backend 3 = green on screen), so 4-player games actually rotated
red -> green -> blue -> yellow. The user reported "nothing changed" — partly
because the deployed container was still running pre-fix code.

### Attempt 2 — rebuild the backend container

Rebuilt `mensch-backend` via `docker compose build web && docker compose up -d web`
and verified the new code was inside the container (`docker exec ... grep`).

Result: the container ran the attempt-1 code, which was still wrong on screen
for 4 players (see above). User reported the issue again.

### Attempt 3 — completely separate 4-player board (current state)

Built a standalone 4-player board from the ground up so the 2-player and
4-player games share no board code and no index/color mapping:

- `front/src/utils/boardCoordinates4p.ts` — self-contained geometry.
  Seating: red bottom-left (0), blue bottom-right (1, next to red),
  green top-right (2), yellow top-left (3). Clockwise, no diagonal neighbours.
- `front/src/components/GameBoard4P.tsx` — fully separate component.
  Backend player index == corner index (identity mapping; the `getVisualIdx`
  swap no longer exists for 4 players).
- `front/src/App.tsx` — routes `player_count === 4` to `GameBoard4P`;
  the old `GameBoard` keeps only the 2/3-player paths (its 4-player mapping
  branch was removed).
- `app/services/game_service.py` — `_rotate_turn` now uses `4: [0, 1, 2, 3]`
  (red -> blue -> green -> yellow) to match the new seating.
- Rebuilt `front/dist` (verified `tsc` passes, the bundle contains the
  `player_count === 4 ? GameBoard4P : GameBoard` routing and no longer contains
  the old swap mapping) and rebuilt the backend container (verified the
  `[0, 1, 2, 3]` line inside the container).

## Current Status / Open Questions

- The code is verified locally (typecheck, bundle inspection, container grep),
  but the user still reports the same behaviour.
- Likely causes that still need checking:
  1. The tested instance is a remote deployment (e.g. Chabokan / porteghal)
     that has not received these changes — local Docker rebuilds and the local
     `front/dist` build only affect localhost; the live host must be redeployed
     from this git branch.
  2. Browser/service-worker caching of the old frontend bundle.
  3. A 3-player game was tested instead of 4-player — 3-player still relies on
     the `getVisualIdx` mapping inside the shared `GameBoard.tsx` and was not
     part of the separate-board work.
- To confirm: hard-refresh the frontend, run a fresh 4-player match on the
  redeployed host, and watch which colors appear in which corners and the order
  of the turn highlight around the board.

## How to Verify the Fix

1. Start the backend and frontend from this branch (or redeploy them).
2. Create a 4-player match.
3. Expect, on screen, bottom-left red, bottom-right blue, top-right green,
   top-left yellow, and the turn highlight cycling
   red -> blue -> green -> yellow -> red.
