/**
 * @file src/App.tsx
 * @description Master App component for the Mensch multiplayer game.
 * Orchestrates views (Lobby, Queue, Board), manages overlays, and integrates HTML5 audio announcements.
 */

import React, { useEffect, useRef } from 'react';
import { useMenschSocket } from './hooks/useMenschSocket';
import { LobbyScreen } from './components/LobbyScreen';
import { QueueScreen } from './components/QueueScreen';
import { GameBoard } from './components/GameBoard';
import { GameOverModal } from './components/GameOverModal';
import { DisconnectOverlay } from './components/DisconnectOverlay';

export const App: React.FC = () => {
  // Extract all websocket reactive states and handlers from our custom hook
  const {
    playerId,
    playerName,
    playerAvatar,
    connectionState,
    gameState,
    disconnectedPlayer,
    error,
    joinQueue,
    rollDice,
    movePiece,
    nextRound,
    restartGame,
    leaveGame,
  } = useMenschSocket();

  // References to prevent duplicate audio plays on the same event trigger
  const lastDiceValueRef = useRef<number | null>(null);
  const lastGameStatusRef = useRef<string | null>(null);

  /**
   * Monitor gameState changes to trigger appropriate audio sound effects
   */
  useEffect(() => {
    if (!gameState) {
      // Reset ref states if the game session is cleared
      lastDiceValueRef.current = null;
      lastGameStatusRef.current = null;
      return;
    }

    // Trigger 1: Dice Roll audio announcement
    if (gameState.dice !== null && gameState.dice !== lastDiceValueRef.current) {
      // Plays corresponding /audio/1.mp3 to /audio/6.mp3 files for dice
      const diceAudio = new Audio(`/audio/${gameState.dice}.mp3`);
      diceAudio.play().catch((err) => {
        console.warn('Audio announcement failed (interaction required first):', err);
      });
    }
    // Update reference value
    lastDiceValueRef.current = gameState.dice;

    // Trigger 2: Game Completion Victory / Defeat music
    if (gameState.status === 'finished' && lastGameStatusRef.current !== 'finished') {
      const isWinner = gameState.winner_id === playerId;
      
      // Select appropriate win/lose sound file from the asset folder
      const soundFile = isWinner
        ? '/audio/musheran-win-176035.mp3'
        : '/audio/floraphonic-violin-lose-5-185126.mp3';

      const statusAudio = new Audio(soundFile);
      statusAudio.play().catch((err) => {
        console.warn('Game over status audio play failed:', err);
      });
    }
    // Update reference value
    lastGameStatusRef.current = gameState.status;

  }, [gameState, playerId]);

  /**
   * Screen router helper based on the active connectionState of the socket.
   */
  const renderView = () => {
    // Show error message top banner if any server network error occurs
    if (error && connectionState === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-red-500/20 shadow-xl">
            <h2 className="text-xl font-bold text-red-500 mb-2">Connection Error</h2>
            <p className="text-sm text-slate-400 mb-6">{error}</p>
            <button
              type="button"
              onClick={leaveGame}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold transition duration-200"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      );
    }

    switch (connectionState) {
      case 'idle':
        // Show initial registration form lobby
        return (
          <LobbyScreen
            onJoinQueue={joinQueue}
            isConnecting={false}
          />
        );

      case 'connecting_queue':
        // Fallthrough indicator to waiting screen
      case 'queue_waiting':
        // Show waiting queue lobby with pulse animations
        return (
          <QueueScreen
            playerName={playerName}
            playerAvatar={playerAvatar}
            onLeaveQueue={leaveGame}
          />
        );

      case 'connecting_room':
        // Show a temporary clean transition loader screen while socket initializes
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
            <span className="w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-medium tracking-wide animate-pulse">
              Entering Game Room...
            </p>
          </div>
        );

      case 'playing':
        // Fallthrough to board rendering in finished state as well (with overlay)
      case 'finished':
        if (!gameState) return null;
        
        return (
          <div className="relative">
            {/* Layer 1: The visual grid and pieces */}
            <GameBoard
              gameState={gameState}
              localPlayerId={playerId}
              onRollDice={rollDice}
              onMovePiece={movePiece}
              onRestartGame={restartGame}
              onLeave={leaveGame}
            />

            {/* Layer 2: Temporary alert if an opponent disconnects */}
            <DisconnectOverlay
              isOpen={!!disconnectedPlayer}
              playerName={disconnectedPlayer?.name || ''}
              timeLeft={disconnectedPlayer?.timeLeft || 0}
            />

            {/* Layer 3: Final Winner Display modal on finished state */}
            <GameOverModal
              isOpen={connectionState === 'finished'}
              winnerId={gameState.winner_id}
              players={gameState.players}
              localPlayerId={playerId}
              onNextRound={nextRound}
              onRestartGame={restartGame}
              onLeave={leaveGame}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    // Unified dark container ensuring optimal layout on all smartphones and browsers
    <main className="min-h-screen bg-slate-950 select-none overflow-x-hidden">
      {renderView()}
    </main>
  );
};

export default App;