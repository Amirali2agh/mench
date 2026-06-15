/**
 * @file src/components/Dice.tsx
 * @description Interactive 2D/3D-like Dice component designed in English.
 * Features rolling animations, dot patterns for values 1-6, and active turn highlights.
 */

import React, { useState } from 'react';

interface DiceProps {
  /**
   * The current numeric value of the dice (1 to 6) or null if not rolled.
   */
  value: number | null;
  /**
   * Indicates if the current player is allowed to roll the dice.
   */
  canRoll: boolean;
  /**
   * Callback executed when the player clicks the dice to trigger a roll.
   */
  onRoll: () => void;
}

export const Dice: React.FC<DiceProps> = ({ value, canRoll, onRoll }) => {
  // Local state to trigger a temporary rolling spin animation on click
  const [isRolling, setIsRolling] = useState<boolean>(false);

  /**
   * Triggers local rolling animation before executing the backend roll action.
   */
  const handleRollClick = () => {
    if (!canRoll || isRolling) return;

    // Trigger local rolling state for 600ms to simulate physical dice spin
    setIsRolling(true);
    
    // Execute backend trigger action immediately
    onRoll();

    setTimeout(() => {
      setIsRolling(false);
    }, 600);
  };

  /**
   * Helper function to render correct dot positions on the 3x3 grid 
   * of the dice face based on values 1 to 6.
   */
  const renderDots = (val: number) => {
    // Array representing 9 slots (3x3 grid) on a dice face
    const dots = Array(9).fill(false);

    // Map dice numbers to specific grid indices
    switch (val) {
      case 1:
        dots[4] = true; // Center
        break;
      case 2:
        dots[0] = true; // Top-Left
        dots[8] = true; // Bottom-Right
        break;
      case 3:
        dots[0] = true; // Top-Left
        dots[4] = true; // Center
        dots[8] = true; // Bottom-Right
        break;
      case 4:
        dots[0] = true; // Top-Left
        dots[2] = true; // Top-Right
        dots[6] = true; // Bottom-Left
        dots[8] = true; // Bottom-Right
        break;
      case 5:
        dots[0] = true; // Top-Left
        dots[2] = true; // Top-Right
        dots[4] = true; // Center
        dots[6] = true; // Bottom-Left
        dots[8] = true; // Bottom-Right
        break;
      case 6:
        dots[0] = true; // Top-Left
        dots[2] = true; // Top-Right
        dots[3] = true; // Middle-Left
        dots[5] = true; // Middle-Right
        dots[6] = true; // Bottom-Left
        dots[8] = true; // Bottom-Right
        break;
    }

    return (
      <div className="grid grid-cols-3 gap-1.5 w-12 h-12 p-1.5 justify-items-center items-center">
        {dots.map((active, idx) => (
          <div
            key={idx}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              active ? 'bg-slate-900 scale-100 shadow-sm' : 'bg-transparent scale-0'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Interactive Dice Block */}
      <button
        type="button"
        disabled={!canRoll || isRolling}
        onClick={handleRollClick}
        className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all duration-300 relative select-none ${
          canRoll && !isRolling
            ? 'bg-gradient-to-br from-white to-slate-100 border-indigo-400 hover:border-indigo-500 hover:shadow-indigo-500/20 active:scale-90 cursor-pointer animate-pulse'
            : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
        } ${isRolling ? 'animate-spin scale-110 border-indigo-500 shadow-indigo-500/30' : ''}`}
      >
        {/* Render value dots or show a fallback state if empty */}
        {value && !isRolling ? (
          renderDots(value)
        ) : (
          <div className="text-2xl font-black text-indigo-400">
            {isRolling ? '?' : 'ROLL'}
          </div>
        )}

        {/* Outer subtle glow indicators if it is local player's active turn */}
        {canRoll && !isRolling && (
          <span className="absolute -inset-1 rounded-2xl border-2 border-indigo-500/30 animate-ping pointer-events-none" />
        )}
      </button>

      {/* Helper text display for active status feedback */}
      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
        {isRolling
          ? 'Rolling...'
          : canRoll
          ? 'Your Turn - Click!'
          : 'Waiting...'}
      </span>
    </div>
  );
};