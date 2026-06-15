/**
 * @file src/hooks/useMenschSocket.ts
 * @description Custom React hook to manage real-time game connections via WebSockets.
 * Handles matchmaking queue connection, active game room synchronization, and action broadcasts.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ServerMessage, ClientAction } from '../types';

// Connection state types for tracking the exact network status.
export type SocketConnectionState =
  | 'idle'                // Initial state before any network action
  | 'connecting_queue'    // Connecting to the matchmaking queue WS
  | 'queue_waiting'       // Connected to queue, waiting for enough players
  | 'connecting_room'     // Match found, connecting to the assigned game room WS
  | 'playing'             // Successfully connected to room and synced
  | 'finished';           // Match completed

export interface DisconnectedPlayerInfo {
  id: string;
  name: string;
  timeLeft: number;       // Remaining seconds before forfeit (starts at 60)
}

export function useMenschSocket() {
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('idle');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<DisconnectedPlayerInfo | null>(null);

  // References to keep persistent socket connections across renders
  const queueSocketRef = useRef<WebSocket | null>(null);
  const roomSocketRef = useRef<WebSocket | null>(null);

  // Keep track of the current playerId to allow seamless reconnection
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerAvatar, setPlayerAvatar] = useState<string>('');

  // Setup unique Player ID on hook mount (persisted in localStorage)
  useEffect(() => {
    let storedId = localStorage.getItem('mensch_player_id');
    if (!storedId) {
      storedId = `p-${crypto.randomUUID()}`;
      localStorage.setItem('mensch_player_id', storedId);
    }
    setPlayerId(storedId);
  }, []);

  /**
   * Helper function to clean up and close any open WebSocket connections.
   */
  const disconnectAll = useCallback(() => {
    if (queueSocketRef.current) {
      queueSocketRef.current.close();
      queueSocketRef.current = null;
    }
    if (roomSocketRef.current) {
      roomSocketRef.current.close();
      roomSocketRef.current = null;
    }
  }, []);

  /**
   * Connects to the active game room WebSocket using the given roomId.
   */
  const connectToRoom = useCallback((roomId: string, pId: string, pName: string) => {
    setConnectionState('connecting_room');
    disconnectAll();

    // WS URL: ws://localhost:8000/ws/room/{room_id}?playerId={id}&playerName={name}
    const wsUrl = `ws://localhost:8000/ws/room/${roomId}?playerId=${pId}&playerName=${encodeURIComponent(pName)}`;
    const ws = new WebSocket(wsUrl);
    roomSocketRef.current = ws;

    ws.onopen = () => {
      setConnectionState('playing');
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage | any = JSON.parse(event.data);

        // Handle standard synchronized game state update
        if (message.type === 'sync_state') {
          setGameState(message.game);
          if (message.game.status === 'finished') {
            setConnectionState('finished');
          }
        }
        
        // Handle explicit player disconnected alerts from server
        else if (message.type === 'player_disconnected' || message.type === 'opponent_disconnected') {
          // If the server signals a disconnect forfeit timer has started
          const targetId = message.player_id;
          const targetName = message.player_name || 'حریف';
          setDisconnectedPlayer({
            id: targetId,
            name: targetName,
            timeLeft: 60
          });
        }

        // Handle player reconnected alert from server
        else if (message.type === 'player_reconnected') {
          setDisconnectedPlayer(null);
        }

      } catch (err) {
        console.error('Failed to parse room WebSocket message:', err);
      }
    };

    ws.onerror = () => {
      setError('خطا در برقراری ارتباط با اتاق بازی.');
      setConnectionState('idle');
    };

    ws.onclose = () => {
      // Return to idle state only if we were not already in finished state
      setConnectionState((prev) => (prev === 'finished' ? 'finished' : 'idle'));
    };
  }, [disconnectAll]);

  /**
   * Initiates the matchmaking queue WebSocket connection.
   */
  const joinQueue = useCallback((name: string, avatar: string, playerCount: number, piecesCount: number) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setConnectionState('connecting_queue');
    setError(null);
    disconnectAll();

    // WS URL: ws://localhost:8000/ws/queue?playerId={id}&playerName={name}&playerAvatarUrl={url}...
    const params = new URLSearchParams({
      playerId,
      playerName: name,
      playerAvatarUrl: avatar || 'https://api.dicebear.com/7.x/bottts/svg',
      playerCount: playerCount.toString(),
      piecesCount: piecesCount.toString()
    });

    const wsUrl = `ws://localhost:8000/ws/queue?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    queueSocketRef.current = ws;

    ws.onopen = () => {
      setConnectionState('queue_waiting');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        if (message.type === 'match_found') {
          // Immediately close queue connection and bridge over to room websocket
          disconnectAll();
          connectToRoom(message.room_id, playerId, name);
        }
      } catch (err) {
        console.error('Failed to parse queue WebSocket message:', err);
      }
    };

    ws.onerror = () => {
      setError('خطا در اتصال به صف بازی. مطمئن شوید بک‌اند روشن است.');
      setConnectionState('idle');
    };

    ws.onclose = () => {
      setConnectionState((prev) => (prev === 'queue_waiting' ? 'idle' : prev));
    };
  }, [playerId, connectToRoom, disconnectAll]);

  /**
   * Universal helper to send game actions to the room websocket.
   */
  const sendAction = useCallback((actionPayload: ClientAction) => {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify(actionPayload));
    } else {
      console.warn('Cannot send action. Room WebSocket is not active.');
    }
  }, []);

  // Action wrappers for easier usage inside components
  const rollDice = useCallback(() => sendAction({ action: 'roll_dice' }), [sendAction]);
  
  const movePiece = useCallback((pieceIndex: number) => {
    sendAction({ action: 'move_piece', piece_index: pieceIndex });
  }, [sendAction]);

  const nextRound = useCallback(() => sendAction({ action: 'next_round' }), [sendAction]);
  
  const restartGame = useCallback(() => sendAction({ action: 'restart_game' }), [sendAction]);

  const leaveGame = useCallback(() => {
    disconnectAll();
    setGameState(null);
    setConnectionState('idle');
    setDisconnectedPlayer(null);
  }, [disconnectAll]);

  // Handle local countdown timer when an opponent is disconnected
  useEffect(() => {
    if (!disconnectedPlayer) return;

    const interval = setInterval(() => {
      setDisconnectedPlayer((prev) => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          return null; // Forfeit time elapsed (server will push the 'finished' sync_state anyway)
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [disconnectedPlayer]);

  return {
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
  };
}