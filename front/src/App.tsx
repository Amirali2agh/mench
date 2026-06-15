/**
 * @file src/App.tsx
 * @description Root application component.
 * Integrates theme management with game state routing (Lobby, Queue, Board).
 */

import React, { useEffect, useState } from 'react';
import { useMenschSocket } from './hooks/useMenschSocket';
import { GameState } from './types';
import { LobbyScreen } from './components/LobbyScreen';
import { QueueScreen } from './components/QueueScreen';
import { GameBoard } from './components/GameBoard';
import { DisconnectOverlay } from './components/DisconnectOverlay';
import { GameOverModal } from './components/GameOverModal';
import { applyTheme, ThemeMode } from './utils/theme';

function App() {
  // --- START: THEME MANAGEMENT LOGIC ---
  const [theme, setTheme] = useState<ThemeMode>('dark'); // Default to dark mode

  // Apply the selected theme automatically on mount and when theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  // --- END: THEME MANAGEMENT LOGIC ---

  const {
    gameState,
    isConnected,
    inQueue,
    error,
    actions,
  } = useMenschSocket();

  // --- START: MAIN GAME RENDER LOGIC ---
  const renderGameContent = () => {
    // If we have an active game state, render the board
    if (gameState) {
      return (
        <GameBoard
          gameState={gameState}
          localPlayerId={actions.getPlayerId()}
          onRollDice={actions.rollDice}
          onMovePiece={actions.movePiece}
          onRestartGame={actions.restartGame}
          onLeave={actions.leaveRoom}
        />
      );
    }
    
    // If player is in the matchmaking queue, show the queue screen
    if (inQueue) {
      return <QueueScreen onCancel={actions.leaveQueue} />;
    }

    // Default to the lobby screen to start a new game
    return <LobbyScreen onJoinQueue={actions.joinQueue} />;
  };
  // --- END: MAIN GAME RENDER LOGIC ---

  return (
    <div className="bg-backgroundPrimary text-textPrimary min-h-screen">
      {/* Optional: A global theme toggle button for easy access */}
      <button 
        onClick={toggleTheme} 
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-secondary text-secondaryContent font-semibold shadow-lg"
      >
        Toggle Theme
      </button>
      
      {/* Main content area */}
      {renderGameContent()}
      
      {/* Overlays for connection status and game over */}
      {!isConnected && <DisconnectOverlay message={error} />}
      {gameState?.status === 'finished' && (
        <GameOverModal
          winnerName={gameState.players.find(p => p.id === gameState.winner_id)?.name}
          onPlayAgain={actions.restartGame}
          onExit={actions.leaveRoom}
        />
      )}
    </div>
  );
}

export default App;