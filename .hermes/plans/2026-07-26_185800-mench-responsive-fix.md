# Mench (منچ) Game — Responsive Layout & Bottom Bar Removal Plan

> **For Hermes:** Implement each task below sequentially.

**Goal:** Fix the Mench game frontend so it (a) fits mobile screens without scrolling and (b) removes the bottom player-name/pause bar.

**Architecture:** The game is a React + Vite + Tailwind CSS SPA served by Caddy at `mench.parallax-airdrop.xyz`. The backend (FastAPI + Redis) runs on port 8002. Changes are entirely frontend-only in 4 files under `front/src/`, then rebuilt and redeployed.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, TypeScript

---

## Current State / Problems

1. **Bottom bar is too large and unwanted** — `GameBoard.tsx` has a `<footer>` (lines 226–267) containing:
   - A row of colored player-turn dots
   - A glassmorphic bar showing current player's name, dice value, and a pause/leave button (two vertical bars icon)
   
   The user wants this entire footer removed. The essential elements (leave button, turn indicator) must be relocated into the board area.

2. **Board doesn't scale to viewport** — The board is `max-w-[430px]` with `aspect-square`. On small screens (320–375px) with padding/borders it overflows horizontally, and `overflow-x-hidden` just clips content. The full-page layout (`min-h-screen` + header LUDO title + board + footer) forces scrolling on short screens.

3. **Excessive chrome** — The "LUDO" striped `<header>` (lines 110–117) wastes ~50px of vertical space that could be used by the board.

---

## Proposed Approach

### Responsive Strategy

Replace fixed `max-w-[430px]` with `100vmin`-based sizing that scales the board to the smaller viewport dimension. The board will always fit both axes without scrollbars. The LUDO header is made compact/overlaid or removed. All elements use a single full-screen wrapper with `overflow-hidden` and `h-dvh` / `w-dvw` so the game truly fills the screen.

### Footer Removal Strategy

Remove the entire `<footer>` block. Relocate:
- **Leave button** → absolute-positioned top-right corner (small icon button)
- **Player turn indicator** → thin strip or small dots at the very top or as an overlay in a corner
- **Player name / whose-turn** → already indicated by the border glow on the active player's base yard (the `animate-pulse` / `border-amber-400` effect) AND by which pieces are animating. If an explicit name label is still needed, place it as a minimal overlay inside the board's top area.

The dice in the board center already shows the value, so the dice-value display in the footer is redundant.

---

## Step-by-Step Tasks

### Task 1: Make the board container responsive

**Objective:** The board fills the viewport without scrollbars on any mobile screen (320px and up).

**Files:**
- Modify: `front/src/components/GameBoard.tsx`

**Changes in GameBoard.tsx:**

Replace the outer container and board sizing:

- Outer `min-h-screen flex flex-col justify-between` → `fixed inset-0 flex items-center justify-center overflow-hidden`
- Remove the `header` containing the LUDO title entirely (lines 110–117) — or collapse it to a small overlay label
- Replace the board wrapper div:
  - Current: `max-w-[430px] w-full aspect-square p-2.5 ...`
  - New: `w-[min(90vw,90vh)] aspect-square max-w-[500px] p-[1.5vmin] border-2 ...` 
  - Use `vmin` units for inner gaps: `gap-[0.4vmin]` instead of `gap-0.5`
  - Inner cell `rounded-full` → `rounded-[clamp(2px,0.5vmin,8px)]`
  - Piece sizes: use percentage-based with `w-[80%] h-[80%]`

Remove the `<header>` block entirely (lines 110–117).

**Verification:** Open `index.html` with a small viewport (375x667 iPhone SE). The board should fill the screen with no scrollbar. Resize to 320x568 (iPhone 5) — should still fit.

---

### Task 2: Remove the footer and relocate essential controls

**Objective:** Delete the bottom bar and move leave button + turn indicator into the board overlay.

**Files:**
- Modify: `front/src/components/GameBoard.tsx`

**Changes:**

1. **Delete the entire `<footer>`** block — everything from line 226 (`<footer className=...`) to line 267 (`</footer>`).

2. **Add an absolute-positioned leave button** in the board wrapper:
   ```tsx
   <button
     onClick={onLeave}
     className="absolute top-[-8px] right-[-8px] w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center z-50 active:scale-90 hover:bg-black/80 transition-all"
     title="Leave game"
   >
     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
       <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
       <line x1="12" y1="2" x2="12" y2="12" />
     </svg>
   </button>
   ```

3. **Add minimal turn indicator dots** inside the board wrapper (absolute bottom-left):
   ```tsx
   <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
     {players.map((p, idx) => {
       const vIdx = getVisualIdx(idx);
       return (
         <div
           key={p.id}
           className={`w-2.5 h-2.5 rounded-full border border-white/30 shadow-sm ${
             playerColors[vIdx] ? playerColors[vIdx].piece : 'bg-slate-700'
           } ${current_turn === idx ? 'scale-150 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900' : 'opacity-60'}`}
         />
       );
     })}
   </div>
   ```

4. **Add a tiny current-player name label** if the turn-indicator dots aren't enough — as an absolute positioned badge inside the board's top area:
   ```tsx
   <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white whitespace-nowrap">
     {players[current_turn]?.name || `Player ${current_turn + 1}`}
   </div>
   ```

5. **Set the board wrapper to `relative`** so absolute children position correctly.

**Required board wrapper structure after changes:**
```tsx
<div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2d1b11] via-[#1a0f0a] to-[#0f0805] select-none font-sans">
  <div className="relative w-[min(92vw,92vh)] aspect-square max-w-[500px] ...">
    {/* Leave button */}
    {/* Player name label */}
    {/* The 11x11 grid */}
    {/* Turn indicator dots */}
  </div>
</div>
```

**Verification:** The page shows no footer bar. Leave button is visible at top-right. Turn dots are visible. Clicking leave calls `onLeave`.

---

### Task 3: Rebuild the frontend

**Objective:** Build the updated Vite project.

**Files:**
- Build output: `front/dist/`

**Commands:**
```bash
cd /home/dev/amirali-games/mench/front && npm run build
```

Expected output: a `dist/` folder with updated hashed JS/CSS assets.

**Verification:** `ls -la front/dist/` shows the new build.

---

### Task 4: Deploy to production

**Objective:** Copy the rebuilt dist to the Caddy web root.

**Files:**
- Source: `front/dist/`
- Dest: `/var/www/games/mench/`

**Commands:**
```bash
sudo cp -r /home/dev/amirali-games/mench/front/dist/* /var/www/games/mench/
```

**Verification:** `curl -s https://mench.parallax-airdrop.xyz/ | head -5` shows the updated HTML. Check the asset hash changed (the JS filename in the HTML should be different after the build).

---

## Files Changed

| File | Change |
|------|--------|
| `front/src/components/GameBoard.tsx` | Major: responsive layout, removed footer, relocated leave button + turn indicator, removed LUDO header |
| `front/dist/index.html` | Auto-generated by build |
| `front/dist/assets/*.js` | Auto-generated by build (updated bundle) |
| `/var/www/games/mench/*` | Deployed copy |

No changes needed to: `App.tsx`, `index.html` (root), `types.ts`, `bridge.ts`, `useMenschSocket.ts`, `LobbyScreen.tsx`, `QueueScreen.tsx`, `GameOverModal.tsx`, `DisconnectOverlay.tsx`, `Dice.tsx`, `boardCoordinates.ts`, `colors.ts`, Tailwind config, Vite config.

---

## Risks & Tradeoffs

| Risk | Mitigation |
|------|------------|
| Board pieces might appear too small on very tiny screens | The board scales with `vmin`; pieces are `%` based inside grid cells — they scale proportionally. Test at 320px width. |
| Removing the LUDO header removes branding | This is a sub-game in the Porteghal app; the parent app provides its own header/context. The standalone URL still works but without the brand wordmark. If needed, a tiny `LUDO` watermark can be added inside the board. |
| Removing footer means no obvious "back" button on standalone mode | The top-right leave icon replaces it. It's a standard close/exit icon. |
| `fixed inset-0` might cause issues with the parent WebView | The parent already wraps the iframe/WebView in a flex container. `fixed` is relative to the iframe viewport which is exactly what we want. |

---

## Testing / Validation

1. **Standalone URL test (desktop):** Open `https://mench.parallax-airdrop.xyz/` and resize browser to mobile dimensions. Board fills viewport, no scrolling, no bottom bar.

2. **Standalone URL test (mobile):** Open on a real phone or Chrome DevTools device emulation (iPhone SE, iPhone 12, Galaxy S8). Game fits screen.

3. **Porteghal WebView test:** Open the app, navigate to Mench, create a room, start a game. The WebView renders the board full-screen with no bottom bar and no scroll.

4. **Leave button:** Click the top-right exit icon. Verifies it triggers `onLeave`.

5. **Turn indicator:** Start a 2-player game, note whose turn it is. Verify the turn dots and name label match.

