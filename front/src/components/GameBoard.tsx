/**
 * @file src/components/GameBoard.tsx
 * @description Master GameBoard component designed in English.
 * Renders an 11x11 Ludo grid, places game pieces dynamically with offset stack separation,
 * integrates turn indicators, countdowns, and the interactive Dice.
 */

import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { getPieceCoordinates, getVisualPlayerIndex } from '../utils/boardCoordinates';
import { Dice } from './Dice';

interface GameBoardProps {
  /**
   * The complete, synchronized game state received from the room WS.
   */
  gameState: GameState;
  /**
   * Player ID of the local browser user.
   */
  localPlayerId: string;
  /**
   * Callback to roll the dice.
   */
  onRollDice: () => void;
  /**
   * Callback to move a specific piece index (0 to pieces_count - 1).
   */
  onMovePiece: (pieceIndex: number) => void;
  /**
   * Callback to hard-restart the entire game session.
   */
  onRestartGame: () => void;
  /**
   * Callback to exit the session and return to lobby.
   */
  onLeave: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  localPlayerId,
  onRollDice,
  onMovePiece,
  onRestartGame,
  onLeave,
}) => {
  const { players, current_turn, dice, dice_rolled, pieces, player_count } = gameState;

  // Local turn timer countdown (matches server's 60s rule)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(60);

  // Sync and reset local turn timer when the turn changes in the game state
  useEffect(() => {
    setTurnTimeLeft(60);
  }, [current_turn]);

  // Handle local countdown decrement every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Locate local player index and details
  const localPlayerIndex = players.findIndex((p) => p.id === localPlayerId);
  const isMyTurn = current_turn === localPlayerIndex;

  /**
   * Identifies the CSS color theme for each player based on their visual index.
   * Visual Player 0 -> Red, 1 -> Blue, 2 -> Green, 3 -> Yellow.
   */
  const getPlayerColorClass = (visualIndex: number) => {
    switch (visualIndex) {
      case 0: return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', glow: 'shadow-red-500/30' };
      case 1: return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', glow: 'shadow-blue-500/30' };
      case 2: return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', glow: 'shadow-emerald-500/30' };
      case 3: return { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', glow: 'shadow-yellow-500/30' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500', glow: 'shadow-slate-500/30' };
    }
  };

  /**
   * Renders the individual cells of the 11x11 board.
   * Dynamically colors cells based on yards, tracks, and private home paths.
   */
  const renderBoardGrid = () => {
    const cells = [];

    for (let r = 0; r < 11; r++) {
      for (let c = 0; c < 11; c++) {
        let cellClass = 'bg-slate-900 border border-slate-800/40 rounded-lg';
        
        // Style Bases / Yards in the corners
        if (r >= 0 && r <= 3 && c >= 0 && c <= 3) {
          cellClass = 'bg-red-950/20 border border-red-900/30 rounded-2xl'; // Red Yard
        } else if (r >= 0 && r <= 3 && c >= 7 && c <= 10) {
          cellClass = 'bg-blue-950/20 border border-blue-900/30 rounded-2xl'; // Blue Yard
        } else if (r >= 7 && r <= 10 && c >= 7 && c <= 10) {
          cellClass = 'bg-emerald-950/20 border border-emerald-900/30 rounded-2xl'; // Green Yard
        } else if (r >= 7 && r <= 10 && c >= 0 && c <= 3) {
          cellClass = 'bg-yellow-950/20 border border-yellow-900/30 rounded-2xl'; // Yellow Yard
        }

        // Style the private home columns
        else if (r === 5 && c >= 1 && c <= 4) {
          cellClass = 'bg-red-500/20 border border-red-500/40 rounded-lg'; // Red Home Column
        } else if (c === 5 && r >= 1 && r <= 4) {
          cellClass = 'bg-blue-500/20 border border-blue-500/40 rounded-lg'; // Blue Home Column
        } else if (r === 5 && c >= 6 && c <= 9) {
          cellClass = 'bg-emerald-500/20 border border-emerald-500/40 rounded-lg'; // Green Home Column
        } else if (c === 5 && r >= 7 && r <= 10) {
          cellClass = 'bg-yellow-500/20 border border-yellow-500/40 rounded-lg'; // Yellow Home Column
        }

        // Style the center goal cell
        else if (r === 5 && c === 5) {
          cellClass = 'bg-gradient-to-tr from-indigo-600 to-violet-600 border border-indigo-400 rounded-xl shadow-lg animate-pulse';
        }

        // Highlight player entry starting spaces
        const isRedStart = r === 4 && c === 0;
        const isBlueStart = r === 0 && c === 6;
        const isGreenStart = r === 6 && c === 10;
        const isYellowStart = r === 10 && c === 4;

        if (isRedStart) cellClass = 'bg-red-500/40 border border-red-500 rounded-lg';
        if (isBlueStart) cellClass = 'bg-blue-500/40 border border-blue-500 rounded-lg';
        if (isGreenStart) cellClass = 'bg-emerald-500/40 border border-emerald-500 rounded-lg';
        if (isYellowStart) cellClass = 'bg-yellow-500/40 border border-yellow-500 rounded-lg';

        // Detect if cell is part of the circular shared track (neutral space)
        const isTrack = (r === 4 || r === 6) || (c === 4 || c === 6) || (r === 5 && (c === 0 || c === 10)) || (c === 5 && (r === 0 || r === 10));
        const isNotSpecial = r !== 5 || (c === 0 || c === 10);
        const isNotSpecialCol = c !== 5 || (r === 0 || r === 10);
        
        if (isTrack && isNotSpecial && isNotSpecialCol && !isRedStart && !isBlueStart && !isGreenStart && !isYellowStart) {
          cellClass = 'bg-slate-800/80 border border-slate-750 rounded-lg';
        }

        cells.push(
          <div
            key={`${r}-${c}`}
            className={`${cellClass} transition-all duration-300`}
            style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
          />
        );
      }
    }

    return cells;
  };

  /**
   * Gathers and renders all active player pieces on top of the 11x11 board.
   */
  const renderPieces = () => {
    const rendered: React.ReactNode[] = [];

    players.forEach((player, clientIdx) => {
      const playerPieces = pieces[player.id];
      if (!playerPieces) return;

      const visualIdx = getVisualPlayerIndex(clientIdx, player_count);
      const colorTheme = getPlayerColorClass(visualIdx);

      playerPieces.forEach((relativePos, pieceIdx) => {
        // Skip rendering pieces that have already reached the final goal 44
        if (relativePos === 44) return;

        // Fetch physical grid coordinates from our mapping utility
        const { row, col } = getPieceCoordinates(clientIdx, pieceIdx, relativePos, player_count);

        // Highlight local pieces only when they can actively move
        const isPieceSelectable = isMyTurn && dice_rolled && dice !== null;

        // Apply a small stack translation offset so pieces on the same cell do not overlap completely
        const stackOffset = (pieceIdx - 1.5) * 3;

        rendered.push(
          <button
            key={`${player.id}-${pieceIdx}`}
            type="button"
            disabled={!isPieceSelectable}
            onClick={() => onMovePiece(pieceIdx)}
            style={{
              gridRowStart: row + 1,
              gridColumnStart: col + 1,
              transform: `translate(${stackOffset}px, ${stackOffset}px)`,
              zIndex: isPieceSelectable ? 30 : 20
            }}
            className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-all duration-300 absolute self-center justify-self-center ${
              colorTheme.bg
            } ${
              isPieceSelectable
                ? 'cursor-pointer scale-125 ring-4 ring-indigo-500/50 animate-bounce'
                : 'scale-100'
            }`}
          >
            {/* Small inner dot to make Ludo pieces look premium */}
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
          </button>
        );
      });
    });

    return rendered;
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-slate-950 text-slate-100 font-sans pb-12">
      
      {/* Top Header / Player Status list */}
      <div className="w-full max-w-[450px] flex justify-between gap-2 mb-4">
        {players.map((player, idx) => {
          const visualIdx = getVisualPlayerIndex(idx, player_count);
          const theme = getPlayerColorClass(visualIdx);
          const isActive = idx === current_turn;

          return (
            <div
              key={player.id}
              className={`flex-1 p-2 rounded-xl border flex flex-col items-center transition-all duration-300 ${
                isActive
                  ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-105'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="relative">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 object-cover"
                />
                {/* Active Turn Dot indicator */}
                {isActive && (
                  <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-black text-white ${theme.bg}`}>
                    {turnTimeLeft}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-300 truncate w-full text-center mt-1">
                {player.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Board Container */}
      <div className="relative w-full max-w-[450px] aspect-square bg-slate-900/60 border border-slate-800 rounded-3xl p-3 shadow-2xl backdrop-blur-sm select-none">
        <div className="grid grid-cols-11 grid-rows-11 w-full h-full gap-0.5">
          {/* Layer 1: Render static board grids */}
          {renderBoardGrid()}
          
          {/* Layer 2: Render overlapping player pieces */}
          {renderPieces()}
        </div>
      </div>

      {/* Footer Controls Block: Dice Integration */}
      <div className="w-full max-w-[450px] mt-6 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-around shadow-xl">
        <Dice
          value={dice}
          canRoll={isMyTurn && !dice_rolled}
          onRoll={onRollDice}
        />

        {/* Manual Reset/Exit actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onRestartGame}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold tracking-wider transition-all duration-200"
          >
            RESTART MATCH
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-4 py-2 rounded-lg border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-semibold tracking-wider transition-all duration-200"
          >
            LEAVE GAME
          </button>
        </div>
      </div>

    </div>
  );
};