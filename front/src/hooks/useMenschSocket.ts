/**
 * Custom React hook to manage real-time game connections via WebSockets.
 * Handles matchmaking queue connection, active game room synchronization,
 * postMessage bridge to parent (porteghal-app), and direct room mode.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ServerMessage, ClientAction, GameInfoMessage } from '../types';
import { sendToParent, getQueryParams, getWsBaseUrl } from '../utils/bridge';

// Connection state types for tracking the exact network status.
export type SocketConnectionState =
  | 'idle'
  | 'connecting_queue'
  | 'queue_waiting'
  | 'connecting_room'
  | 'playing'
  | 'finished';

export interface DisconnectedPlayerInfo {
  id: string;
  name: string;
  timeLeft: number;
}

export interface ChatMessage {
  player_id: string;
  player_name: string;
  message: string;
  timestamp: number;
}

export function useMenschSocket() {
  const queryParams = getQueryParams();
  const directRoomId = queryParams.roomId || null;
  const directPlayerNum = queryParams.playerNum ? parseInt(queryParams.playerNum) : null;
  const externalPlayerId = queryParams.playerId || '';
  const externalPlayerName = queryParams.playerName || '';
  const externalPlayerAvatar = queryParams.playerAvatar || '';

  const [connectionState, setConnectionState] = useState<SocketConnectionState>(
    directRoomId ? 'connecting_room' : 'idle'
  );
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<DisconnectedPlayerInfo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfoMessage | null>(null);

  const queueSocketRef = useRef<WebSocket | null>(null);
  const roomSocketRef = useRef<WebSocket | null>(null);

  const [playerId, _setPlayerId] = useState<string>(externalPlayerId || `p-${crypto.randomUUID()}`);
  const [playerName, setPlayerName] = useState<string>(externalPlayerName);
  const [playerAvatar, setPlayerAvatar] = useState<string>(externalPlayerAvatar);
  const [roomId, setRoomId] = useState<string | null>(directRoomId);

  const wsBaseUrl = getWsBaseUrl(8000);

  // Post GAME_FINISHED to parent when game ends
  useEffect(() => {
    if (gameState?.status === 'finished') {
      sendToParent('GAME_FINISHED', {
        winner: gameState.winner_id,
        winType: 'normal',
        playerWon: gameState.winner_id === playerId,
        roomId,
      });
    }
  }, [gameState?.status, gameState?.winner_id, playerId, roomId]);

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

  const connectToRoom = useCallback((rId: string, pId: string, pName: string) => {
    setConnectionState('connecting_room');
    setRoomId(rId);
    disconnectAll();

    const wsUrl = `${wsBaseUrl}/ws/room/${rId}?playerId=${pId}&playerName=${encodeURIComponent(pName)}`;
    const ws = new WebSocket(wsUrl);
    roomSocketRef.current = ws;

    ws.onopen = () => {
      setConnectionState('playing');
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage | any = JSON.parse(event.data);

        if (message.type === 'sync_state') {
          setGameState(message.game);
          if (message.game.status === 'finished') {
            setConnectionState('finished');
          }
        } else if (message.type === 'player_disconnected' || message.type === 'opponent_disconnected') {
          const targetId = message.player_id;
          const targetName = message.player_name || 'حریف';
          setDisconnectedPlayer({ id: targetId, name: targetName, timeLeft: 60 });
        } else if (message.type === 'player_reconnected') {
          setDisconnectedPlayer(null);
        } else if (message.type === 'chat') {
          const chatMsg: ChatMessage = {
            player_id: message.player_id,
            player_name: message.player_name || 'کاربر',
            message: message.message,
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, chatMsg]);
        } else if (message.type === 'game_info') {
          setGameInfo(message);
          // Update player info from porteghal-provided metadata
          if (message.players) {
            const playerMeta = message.players[String(message.player_num)];
            if (playerMeta) {
              _setPlayerId(playerMeta.id);
              setPlayerName(playerMeta.name);
              setPlayerAvatar(playerMeta.avatar);
            }
          }
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
      setConnectionState((prev) => (prev === 'finished' ? 'finished' : 'idle'));
    };
  }, [wsBaseUrl, disconnectAll]);

  useEffect(() => {
    if (directRoomId && directPlayerNum && externalPlayerId) {
      // Connect directly to the existing room WebSocket with player metadata.
      // The server incrementally builds game state as players join.
      connectToRoom(directRoomId, externalPlayerId, externalPlayerName || 'بازیکن');
    }
  }, []); // Run once on mount

  const joinQueue = useCallback((name: string, avatar: string, playerCount: number, piecesCount: number) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setConnectionState('connecting_queue');
    setError(null);
    disconnectAll();

    const params = new URLSearchParams({
      playerId,
      playerName: name,
      playerAvatarUrl: "",
      playerCount: playerCount.toString(),
      piecesCount: piecesCount.toString()
    });

    const wsUrl = `${wsBaseUrl}/ws/queue?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    queueSocketRef.current = ws;

    ws.onopen = () => setConnectionState('queue_waiting');
    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        if (message.type === 'match_found') {
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
  }, [playerId, wsBaseUrl, connectToRoom, disconnectAll]);

  const sendAction = useCallback((actionPayload: ClientAction) => {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify(actionPayload));
    } else {
      console.warn('Cannot send action. Room WebSocket is not active.');
    }
  }, []);

  const rollDice = useCallback(() => sendAction({ action: 'roll_dice' }), [sendAction]);
  const movePiece = useCallback((pieceIndex: number) => {
    sendAction({ action: 'move_piece', piece_index: pieceIndex });
  }, [sendAction]);
  const nextRound = useCallback(() => sendAction({ action: 'next_round' }), [sendAction]);
  const restartGame = useCallback(() => sendAction({ action: 'restart_game' }), [sendAction]);
  const passTurn = useCallback(() => sendAction({ action: 'pass_turn' }), [sendAction]);
  const leaveGame = useCallback(() => {
    disconnectAll();
    setGameState(null);
    setConnectionState('idle');
    setDisconnectedPlayer(null);
    setChatMessages([]);
    sendToParent('GAME_FINISHED', { reason: 'player_left' });
  }, [disconnectAll]);

  const sendChatMessage = useCallback((text: string) => {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify({
        action: 'chat',
        message: text,
        playerName: playerName,
      }));
    }
  }, [playerName]);

  // Handle local countdown timer when an opponent is disconnected
  useEffect(() => {
    if (!disconnectedPlayer) return;
    const interval = setInterval(() => {
      setDisconnectedPlayer((prev) => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          return null;
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
    chatMessages,
    error,
    joinQueue,
    rollDice,
    movePiece,
    nextRound,
    restartGame,
    leaveGame,
    passTurn,
    sendChatMessage,
    directRoomId,
    gameInfo,
  };
}
