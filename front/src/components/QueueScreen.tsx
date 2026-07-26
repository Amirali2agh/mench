/**
 * @file src/components/QueueScreen.tsx
 * @description Matchmaking waiting screen displaying a pulsing radial animation, 
 * the player's profile, and a button to leave the matchmaking queue.
 */

import React from 'react';

interface QueueScreenProps {
  /**
   * Nickname of the local player to display on the card.
   */
  playerName: string;
  /**
   * URL of the local player's avatar.
   */
  playerAvatar: string;
  /**
   * Callback function triggered when the player cancels the search.
   */
  onLeaveQueue: () => void;
}

export const QueueScreen: React.FC<QueueScreenProps> = ({
  playerName,
  playerAvatar,
  onLeaveQueue,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-slate-950 text-slate-100 font-sans">
      
      {/* Central card wrapper with glassmorphic borders */}
      <div className="w-full max-w-sm p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center backdrop-blur-md">
        
        {/* Subtitle / Matchmaking Indicator */}
        <span className="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 rounded-full border border-indigo-500/20">
          صف یابی
        </span>

        {/* Pulsing Avatar Animation block */}
        <div className="relative flex items-center justify-center w-32 h-32 mx-auto mb-8">
          
          {/* Wave ripple effect 1 */}
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping duration-1000"></div>
          
          {/* Wave ripple effect 2 */}
          <div className="absolute inset-2 rounded-full bg-violet-500/10 animate-pulse duration-700"></div>
          
          {/* Solid inner circle enclosing the avatar */}
          <div className="relative z-10 w-24 h-24 p-1 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-xl">
            <img
              src={playerAvatar}
              alt="آواتار کاربر"
              className="w-full h-full object-cover bg-slate-800 rounded-full"
            />
          </div>
        </div>

        {/* Player Name Tag (Handles Unicode/Persian names perfectly) */}
        <h2 className="text-2xl font-extrabold mb-2 text-white truncate px-2">
          {playerName}
        </h2>
        <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
          در حال جستجوی حریف مناسب... لطفاً منتظر بمانید.
        </p>

        {/* Waiting Status text loader */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce"></span>
        </div>

        {/* Cancel/Cancel Search Button */}
        <button
          type="button"
          onClick={onLeaveQueue}
          className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 font-semibold text-sm hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all duration-200 active:scale-[0.98]"
        >
          لغو جستجو
        </button>

      </div>
    </div>
  );
};