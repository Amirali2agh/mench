/**
 * @file src/App.tsx
 * @description Root application component.
 * Integrates theme management with game state routing (Lobby, Queue, Board).
 */

import { useEffect, useState } from 'react';
import { useMenschSocket } from './hooks/useMenschSocket';
import { LobbyScreen } from './components/LobbyScreen';
import { QueueScreen } from './components/QueueScreen';
import { GameBoard } from './components/GameBoard';
import { DisconnectOverlay } from './components/DisconnectOverlay';
import { GameOverModal } from './components/GameOverModal';
import { applyTheme, ThemeMode } from './utils/theme';

export function App() {
  // --- START: THEME MANAGEMENT LOGIC ---
  const [theme, setTheme] = useState<ThemeMode>('dark'); // Default to dark mode

  // Apply the selected theme automatically on mount and when theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  
  // --- END: THEME MANAGEMENT LOGIC ---

  // Destructure flat properties directly from the websocket hook
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
    leaveGame
  } = useMenschSocket();

  // --- START: MAIN GAME RENDER LOGIC ---
 // --- START: MAIN GAME RENDER LOGIC ---
  const renderGameContent = () => {
    // If we have an active game state, render the board
    if (gameState) {
      return (
        <GameBoard
          gameState={gameState}
          localPlayerId={playerId}
          onRollDice={rollDice}
          onMovePiece={movePiece}
          onRestartGame={restartGame}
          onLeave={leaveGame}
        />
      );
    }
    
    // Cast connectionState to string to bypass strict TypeScript TS2367 no-overlap warning
    const stateStr = connectionState as string;
    const inQueue = stateStr === 'connecting_queue' || stateStr === 'queue_waiting';
    
    if (inQueue) {
      return (
        <QueueScreen 
          playerName={playerName} 
          playerAvatar={playerAvatar} 
          onLeaveQueue={leaveGame} 
        />
      );
    }

    // Default to the lobby screen to register and select game options
    return (
      <LobbyScreen 
        onJoinQueue={joinQueue} 
        isConnecting={stateStr === 'connecting_queue'} 
      />
    );
  };
  // --- END: MAIN GAME RENDER LOGIC ---

  return (
    <div className="bg-backgroundPrimary text-textPrimary min-h-screen relative">
      {/* Optional: A global theme toggle button for easy access */}
      
      
      {/* Main content area */}
      {renderGameContent()}
      
      {/* Global connection error toast overlay for the local player */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-semibold shadow-lg shadow-rose-500/10 backdrop-blur-md animate-fade-in">
          {error}
        </div>
      )}

      {/* Opponent forfeit overlay timer triggered when any active player disconnects */}
      <DisconnectOverlay 
        isOpen={!!disconnectedPlayer}
        playerName={disconnectedPlayer?.name || ''}
        timeLeft={disconnectedPlayer?.timeLeft || 60}
      />

      {/* Game Over modal overlay triggered when status changes to finished */}
      {gameState?.status === 'finished' && (
        <GameOverModal
          isOpen={gameState.status === 'finished'}
          winnerId={gameState.winner_id}
          players={gameState.players}
          localPlayerId={playerId}
          onNextRound={nextRound}
          onRestartGame={restartGame}
          onLeave={leaveGame}
        />
      )}
    </div>
  );
}