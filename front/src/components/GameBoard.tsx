// front/src/components/GameBoard.tsx
// Complete visual redesign matching the reference Ludo game UI

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { GameState } from '../types';
import { playerColors } from '../utils/colors';
import { getGridCoordinates, getArrowRotation, GridCoord, safeTrackPositions, circularTrack } from '../utils/boardCoordinates';
import Dice from './Dice';
import type { ChatMessage } from '../hooks/useMenschSocket';

interface GameBoardProps {
  gameState: GameState;
  localPlayerId: string;
  onRollDice: () => void;
  onMovePiece: (pieceIndex: number) => void;
  onLeave: () => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onPassTurn: () => void;
}

const PlayerAvatar: React.FC<{ name: string; avatar?: string }> = ({ name, avatar }) => {
  const initials = name?.charAt(0) || '?';
  return (
    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden shadow-inner text-slate-600 font-bold text-lg">
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

// Star icon for safe cells

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  localPlayerId,
  onRollDice,
  onMovePiece,
  onLeave,
  chatMessages,
  onSendChat,
  onPassTurn,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ═══ Step-by-step piece animation state — MUST be before early return ═══
  const realPositionsRef = useRef<Record<string, number>>({});
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});
  const animTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [animInitialized, setAnimInitialized] = useState(false);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!gameState || !gameState.players || !gameState.pieces) {
    return (
      <div className="fixed inset-0 bg-[#F9F6F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const { players, current_turn, pieces, pieces_count, player_count } = gameState;
  const localPlayerIdx = players.findIndex((p) => p?.id === localPlayerId);
  const isMyTurn = current_turn === localPlayerIdx;

  const getVisualIdx = (backendIdx: number) => {
    if (player_count === 2) {
      if (backendIdx === 0) return 0;
      if (backendIdx === 1) return 3;
    }
    if (player_count === 4) {
      if (backendIdx === 0) return 0;
      if (backendIdx === 1) return 1;
      if (backendIdx === 2) return 3;
      if (backendIdx === 3) return 2;
    }
    return backendIdx;
  };

  const allRenderedPieces: { playerIdx: number; vIdx: number; playerId: string; pieceIdx: number; pos: number; visualPos: number; coord: GridCoord }[] = [];
  players.forEach((player, playerIdx) => {
    if (!player) return;
    const vIdx = getVisualIdx(playerIdx);
    const playerPieces = pieces[player.id] || [];
    for (let i = 0; i < (pieces_count || 4); i++) {
      const realPos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
      const key = `${player.id}-${i}`;
      const visualPos = visualPositions[key] ?? realPos;
      const coord = getGridCoordinates(vIdx, visualPos, i);
      allRenderedPieces.push({ playerIdx, vIdx, playerId: player.id, pieceIdx: i, pos: realPos, visualPos, coord });
    }
  });

  const isPieceMovable = (pieceIdx: number): boolean => {
    if (!isMyTurn || !gameState.dice_rolled) return false;
    const myPieces = pieces[localPlayerId] || [];
    const currentPos = myPieces[pieceIdx];
    if (currentPos === undefined) return false;
    if (currentPos === -1 && gameState.dice !== 6) return false;
    if (gameState.dice && currentPos !== -1 && currentPos + gameState.dice > 44) return false;
    return true;
  };

  const handleDiceClick = () => {
    if (!isMyTurn || isSpinning || gameState.dice_rolled) return;
    setIsSpinning(true);
    onRollDice();
  };

  // Stop spinning when the WebSocket confirms the roll result
  useEffect(() => {
    if (isSpinning && gameState.dice !== null) {
      const timer = setTimeout(() => setIsSpinning(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isSpinning, gameState.dice]);

  // ═══ 45s turn timer ═══
  const TURN_TIMEOUT = 45;
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIMEOUT);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasActedRef = useRef(false);

  // ═══ Board measurement for piece animation ═══
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellPitch, setCellPitch] = useState(0);

  // Measure the CSS Grid's cell pitch (width of one cell including gap share)
  // so we can absolutely-position pieces and animate them with CSS transitions.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const grid = board.querySelector('.grid');
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      setCellPitch(rect.width / 11);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    return () => ro.disconnect();
  }, []);

  // Detect piece movements from the server and trigger step-by-step animation
  useEffect(() => {
    if (!gameState?.pieces || !players.length) return;

    // First load — initialise visual positions to match server without animation
    if (!animInitialized) {
      const initial: Record<string, number> = {};
      players.forEach((player) => {
        if (!player) return;
        const playerPieces = pieces[player.id] || [];
        for (let i = 0; i < (pieces_count || 4); i++) {
          const key = `${player.id}-${i}`;
          const pos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
          initial[key] = pos;
          realPositionsRef.current[key] = pos;
        }
      });
      setVisualPositions(initial);
      setAnimInitialized(true);
      return;
    }

    // Collect moved pieces
    const moves: Array<{ key: string; from: number; to: number }> = [];
    players.forEach((player) => {
      if (!player) return;
      const playerPieces = pieces[player.id] || [];
      for (let i = 0; i < (pieces_count || 4); i++) {
        const newPos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
        const key = `${player.id}-${i}`;
        const oldPos = realPositionsRef.current[key];
        if (oldPos !== undefined && oldPos !== newPos) {
          moves.push({ key, from: oldPos, to: newPos });
        }
      }
    });

    // Start step-by-step animations
    for (const { key, from, to } of moves) {
      if (from >= 0 && to > from) {
        // Forward movement on the track/home stretch — animate one cell at a time
        const steps = to - from;
        // Cancel any stale animation for this piece
        if (animTimersRef.current[key]) {
          clearInterval(animTimersRef.current[key]);
        }
        // Set visual position to the starting cell
        setVisualPositions((prev) => ({ ...prev, [key]: from }));
        let currentStep = 0;
        animTimersRef.current[key] = setInterval(() => {
          currentStep++;
          const stepPos = from + currentStep;
          setVisualPositions((prev) => ({ ...prev, [key]: stepPos }));
          if (currentStep >= steps) {
            clearInterval(animTimersRef.current[key]);
            delete animTimersRef.current[key];
          }
        }, 160);
      } else {
        // Yard → track, capture back to yard, or any backward move — snap immediately
        setVisualPositions((prev) => ({ ...prev, [key]: to }));
      }
    }

    // Persist the new server positions
    players.forEach((player) => {
      if (!player) return;
      const playerPieces = pieces[player.id] || [];
      for (let i = 0; i < (pieces_count || 4); i++) {
        const key = `${player.id}-${i}`;
        realPositionsRef.current[key] = playerPieces[i] !== undefined ? playerPieces[i] : -1;
      }
    });
  }, [gameState?.pieces]);

  // Cleanup all animation timers on unmount
  useEffect(() => {
    return () => {
      Object.values(animTimersRef.current).forEach(clearInterval);
    };
  }, []);

  // Reset timer when the active turn changes
  useEffect(() => {
    setTurnTimeLeft(TURN_TIMEOUT);
    hasActedRef.current = false;
  }, [gameState?.current_turn, gameState?.status]);

  // Countdown tick — only auto-pass when it's the LOCAL player's turn
  useEffect(() => {
    if (gameState?.status !== 'playing') return;

    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          if (turnTimerRef.current) clearInterval(turnTimerRef.current);
          // Only pass if it's the local player's turn and they haven't acted
          if (current_turn === localPlayerIdx && !hasActedRef.current) {
            onPassTurn();
          }
          return current_turn === localPlayerIdx ? 0 : prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [gameState?.current_turn, gameState?.status, onPassTurn]);

  // Mark that the player has acted (rolled or moved)
  useEffect(() => {
    if (gameState?.dice_rolled || gameState?.dice !== null) {
      hasActedRef.current = true;
    }
  }, [gameState?.dice_rolled, gameState?.dice]);

  const getColorForVisualIdx = (vIdx: number): string => {
    const map: Record<number, string> = {
      0: '#F94144', // red
      1: '#277DA1', // blue
      2: '#43AA8B', // green
      3: '#F9C74F', // yellow
    };
    return map[vIdx] || '#999';
  };

  // Map player index to visual position around the board
  // TL=green(v2), TR=blue(v1), BL=red(v0), BR=yellow(v3)
  const getPlayerPanelPosition = (playerIdx: number): 'tl' | 'tr' | 'bl' | 'br' | null => {
    const vIdx = getVisualIdx(playerIdx);
    const map: Record<number, 'tl' | 'tr' | 'bl' | 'br'> = {
      2: 'tl',  // green → top-left
      1: 'tr',  // blue → top-right
      0: 'bl',  // red → bottom-left
      3: 'br',  // yellow → bottom-right
    };
    return map[vIdx] || null;
  };

  const renderBaseYard = (vIdx: number) => {
    const theme = playerColors[vIdx];
    if (!theme) return null;
    const ownerIdx = players.findIndex((_, i) => getVisualIdx(i) === vIdx);
    const isOwned = ownerIdx !== -1;
    const isPlayerActive = isOwned && current_turn === ownerIdx;
    const color = getColorForVisualIdx(vIdx);

    return (
      <div className={`w-full h-full rounded-[clamp(8px,1.5vmin,18px)] ${theme.bg} border-[clamp(1px,0.2vmin,2.5px)] ${
        isPlayerActive ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)]' : 'border-white/20'
      } ${!isOwned ? 'opacity-30 grayscale' : ''} flex items-center justify-center relative shadow-[inset_0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-300`}>
        <div className="grid grid-cols-2 grid-rows-2 gap-[clamp(3px,0.5vmin,8px)] p-[clamp(4px,0.8vmin,12px)] w-full h-full">
          {Array.from({ length: 4 }).map((_, idx) => {
            const slotTaken = ownerIdx >= 0 && players[ownerIdx] && pieces[players[ownerIdx].id]?.[idx] === -1;
            const isMovablePiece = ownerIdx === localPlayerIdx && slotTaken && isMyTurn && gameState.dice === 6 && gameState.dice_rolled;
            return (
              <div
                key={idx}
                className="w-full h-full rounded-full bg-black/15 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3)] border border-white/5 flex items-center justify-center relative"
              >
                {slotTaken && (
                  <div
                    onClick={() => isMovablePiece && onMovePiece(idx)}
                    className={`w-[80%] h-[80%] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] flex items-center justify-center relative ${
                      isMovablePiece ? 'cursor-pointer animate-bounce ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent z-30 scale-105' : ''
                    }`}
                  >
                    <div className="w-[70%] h-[70%] rounded-full relative overflow-hidden" style={{ backgroundColor: color }}>
                      {/* Specular highlight */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent rounded-full" />
                    </div>
                    {/* Top-left gleam */}
                    <div className="absolute top-[8%] left-[15%] w-[30%] h-[20%] rounded-full bg-white/60 blur-[1px] rotate-[-20deg]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Build player panels for the 4 corners
  const renderPlayerPanel = (playerIdx: number) => {
    const pos = getPlayerPanelPosition(playerIdx);
    if (!pos || !players[playerIdx]) return null;
    const p = players[playerIdx];
    const vIdx = getVisualIdx(playerIdx);
    const color = getColorForVisualIdx(vIdx);
    const isTurn = current_turn === playerIdx;

    return (
      <div className={`flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.06)] px-2 py-1 ${isTurn ? 'ring-2 ring-amber-400/60' : ''}`}>
        <div className="relative w-[42px] h-[42px] flex items-center justify-center">
          {/* Turn countdown ring */}
          {isTurn && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 42 42">
              <circle
                cx="21" cy="21" r="19"
                fill="none"
                stroke="rgba(251,191,36,0.25)"
                strokeWidth="2.5"
              />
              <circle
                cx="21" cy="21" r="19"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 19}`}
                strokeDashoffset={`${(1 - turnTimeLeft / 45) * 2 * Math.PI * 19}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
          )}
          <PlayerAvatar name={p.name} avatar={p.avatar} />
          <div className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 border-white" style={{ backgroundColor: color }} />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-semibold text-[#2C2C2C] whitespace-nowrap">{p.name}</span>
          <div className="flex items-center gap-1">
            <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: color }} />
          </div>
        </div>
      </div>
    );
  };

  // Find players for each position
  const tlPlayer = players.findIndex((_, i) => getVisualIdx(i) === 2);
  const trPlayer = players.findIndex((_, i) => getVisualIdx(i) === 1);
  const blPlayer = players.findIndex((_, i) => getVisualIdx(i) === 0);
  const brPlayer = players.findIndex((_, i) => getVisualIdx(i) === 3);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F9F6F0] font-sans overflow-hidden select-none">
      
      {/* ═══ TOP HEADER ═══ */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={onLeave}
          className="w-[44px] h-[44px] bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.05)] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <div className="bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.04)] px-6 py-2">
          <span className="text-[15px] font-bold text-[#2C2C2C]">منچ آنلاین</span>
        </div>

        <div className="w-[44px] h-[44px] bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.05)] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#D4A373" stroke="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </header>

      {/* ═══ MAIN AREA: Player panels + Board + Dice ═══ */}
      <main className="flex-1 flex flex-col overflow-hidden px-2">
        
        {/* Top players row */}
        <div className="flex justify-between items-start px-1 pt-1 pb-1 min-h-[52px]">
          <div>{tlPlayer >= 0 && renderPlayerPanel(tlPlayer)}</div>
          <div>{trPlayer >= 0 && renderPlayerPanel(trPlayer)}</div>
        </div>

        {/* Board + Bottom players */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-0">
          
          {/* Board */}
          <div ref={boardRef} className="relative w-[min(88vw,78vh)] aspect-square max-w-[480px] bg-[#FAF4E6] rounded-[clamp(16px,3vmin,28px)] p-[clamp(8px,1.5vmin,16px)] shadow-[0_16px_36px_rgba(0,0,0,0.08),inset_0_2px_6px_rgba(255,255,255,0.6)] border-[clamp(2px,0.4vmin,4px)] border-[#E8D3B0] flex items-center justify-center">
            <div className="relative w-full h-full">
              <div className="grid grid-cols-11 grid-rows-11 gap-[0.35vmin] w-full h-full relative">
              
              {/* Yards */}
              <div className="col-start-1 col-end-5 row-start-1 row-end-5 p-[0.3vmin]">{renderBaseYard(2)}</div>  {/* TL: green */}
              <div className="col-start-8 col-end-12 row-start-1 row-end-5 p-[0.3vmin]">{renderBaseYard(1)}</div>  {/* TR: blue */}
              <div className="col-start-1 col-end-5 row-start-8 row-end-12 p-[0.3vmin]">{renderBaseYard(0)}</div>  {/* BL: red */}
              <div className="col-start-8 col-end-12 row-start-8 row-end-12 p-[0.3vmin]">{renderBaseYard(3)}</div>  {/* BR: yellow */}

              <div className="absolute inset-0 bg-white/30 rounded-xl pointer-events-none -z-10" />

              {/* Grid cells */}
              {Array.from({ length: 11 }).map((_, rIdx) => {
                return Array.from({ length: 11 }).map((_, cIdx) => {
                  if (rIdx < 4 && cIdx < 4) return null;
                  if (rIdx < 4 && cIdx >= 7) return null;
                  if (rIdx >= 7 && cIdx < 4) return null;
                  if (rIdx >= 7 && cIdx >= 7) return null;

                  // Center cell - home triangle area
                  if (rIdx === 5 && cIdx === 5) {
                    return (
                      <div key={`cell-${rIdx}-${cIdx}`} className="col-start-6 col-end-7 row-start-6 row-end-7 flex items-center justify-center relative">
                        {/* Colored triangles in center */}
                        <div className="w-full h-full rounded-lg overflow-hidden relative">
                          {/* Top triangle - Blue */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[clamp(8px,1.5vmin,18px)] border-r-[clamp(8px,1.5vmin,18px)] border-b-[clamp(8px,1.5vmin,18px)] border-l-transparent border-r-transparent border-b-[#277DA1]/40" />
                          {/* Right triangle - Yellow */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[clamp(8px,1.5vmin,18px)] border-b-[clamp(8px,1.5vmin,18px)] border-l-[clamp(8px,1.5vmin,18px)] border-t-transparent border-b-transparent border-l-[#F9C74F]/40" />
                          {/* Bottom triangle - Red */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[clamp(8px,1.5vmin,18px)] border-r-[clamp(8px,1.5vmin,18px)] border-t-[clamp(8px,1.5vmin,18px)] border-l-transparent border-r-transparent border-t-[#F94144]/40" />
                          {/* Left triangle - Green */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[clamp(8px,1.5vmin,18px)] border-b-[clamp(8px,1.5vmin,18px)] border-r-[clamp(8px,1.5vmin,18px)] border-t-transparent border-b-transparent border-r-[#43AA8B]/40" />
                          {/* Center circle */}
                          <div className="absolute inset-[25%] rounded-full bg-[#E8D3B0]/50 border border-[#D4C4A0]" />
                        </div>
                      </div>
                    );
                  }

                  let customBg = 'bg-white';
                  let isHomeStretch = false;
                  let isStarCell = false;

                  // Home stretch: colored path from each corner toward center
                  // Blue (TR → center vertical): cIdx===5, rIdx 1-4
                  // Yellow (BR → center horizontal): rIdx===5, cIdx 6-9
                  // Green (TL → center horizontal): rIdx===5, cIdx 1-4
                  // Red (BL → center vertical): cIdx===5, rIdx 6-9
                  
                  if (cIdx === 5 && rIdx >= 1 && rIdx <= 4) { customBg = 'bg-[#277DA1]/30'; isHomeStretch = true; }
                  else if (rIdx === 5 && cIdx >= 6 && cIdx <= 9) { customBg = 'bg-[#F9C74F]/30'; isHomeStretch = true; }
                  else if (rIdx === 5 && cIdx >= 1 && cIdx <= 4) { customBg = 'bg-[#43AA8B]/30'; isHomeStretch = true; }
                  else if (cIdx === 5 && rIdx >= 6 && rIdx <= 9) { customBg = 'bg-[#F94144]/30'; isHomeStretch = true; }

                  // Starting position markers (colored cells where players enter the track)
                  // Blue start: (0,6), Yellow start: (6,10), Green start: (4,0), Red start: (10,4)
                  if (rIdx === 0 && cIdx === 6) customBg = 'bg-[#277DA1]';
                  else if (rIdx === 6 && cIdx === 10) customBg = 'bg-[#F9C74F]';
                  else if (rIdx === 4 && cIdx === 0) customBg = 'bg-[#43AA8B]';
                  else if (rIdx === 10 && cIdx === 4) customBg = 'bg-[#F94144]';

                  // Star cells on safe positions
                  // Check if this cell is a star position on the circular track
                  const cellOnTrack = (r: number, c: number): number | null => {
                    for (let i = 0; i < 39; i++) {
                      const t = circularTrack[i];
                      if (t && t.r === r && t.c === c) return i;
                    }
                    return null;
                  };
                  const starIdx = cellOnTrack(rIdx, cIdx);
                  if (starIdx !== null && safeTrackPositions.has(starIdx)) {
                    isStarCell = true;
                  }

                  const arrowRotation = getArrowRotation({ r: rIdx, c: cIdx });

                  return (
                    <div
                      key={`cell-${rIdx}-${cIdx}`}
                      style={{ gridRowStart: rIdx + 1, gridColumnStart: cIdx + 1 }}
                      className={`rounded-full border ${
                        customBg === 'bg-white' 
                          ? 'border-[#D4C4A0]/60 shadow-[0_1px_2px_rgba(0,0,0,0.08)]' 
                          : isHomeStretch 
                            ? 'border-transparent' 
                            : 'border-white/40 shadow-inner'
                      } flex items-center justify-center relative transition-all duration-300 ${customBg} aspect-square p-[0.15vmin]`}
                    >
                      {isStarCell ? (
                        <svg className="w-3/5 h-3/5 text-amber-500 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ) : !isHomeStretch && !customBg.startsWith('bg-[') && customBg === 'bg-white' ? (
                        <svg className={`w-2/5 h-2/5 text-[#C4B89A]/60 ${arrowRotation}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : null}
                    </div>
                  );
                });
              })}

            </div>

            {/* ═══ Animated piece overlay ═══ */}
            {cellPitch > 0 && allRenderedPieces.filter(p => p.visualPos >= 0).length > 0 && (
              <div className="absolute inset-0 z-20" style={{ pointerEvents: 'none' }}>
                {allRenderedPieces.filter(p => p.visualPos >= 0).map(({ vIdx, playerId: pId, pieceIdx, coord }) => {
                  const theme = playerColors[vIdx];
                  if (!theme) return null;
                  const isMovable = pId === localPlayerId && isPieceMovable(pieceIdx);

                  const piecesInSameCoord = allRenderedPieces.filter(
                    (p) => p.coord.r === coord.r && p.coord.c === coord.c
                  );
                  const pieceIndexInSameCoord = piecesInSameCoord.findIndex(
                    (p) => p.playerId === pId && p.pieceIdx === pieceIdx
                  );

                  const pieceSize = cellPitch * 0.8;
                  const overlapOffset = piecesInSameCoord.length > 1
                    ? (pieceIndexInSameCoord - (piecesInSameCoord.length - 1) / 2) * 5
                    : 0;

                  const color = getColorForVisualIdx(vIdx);

                  return (
                    <div
                      key={`piece-${pId}-${pieceIdx}`}
                      style={{
                        position: 'absolute',
                        left: `${coord.c * cellPitch + (cellPitch - pieceSize) / 2 + overlapOffset}px`,
                        top: `${coord.r * cellPitch + (cellPitch - pieceSize) / 2 - overlapOffset}px`,
                        width: `${pieceSize}px`,
                        height: `${pieceSize}px`,
                        transition: 'left 0.15s ease, top 0.15s ease',
                        zIndex: 20 + pieceIndexInSameCoord,
                        pointerEvents: 'auto',
                      }}
                      onClick={() => isMovable && onMovePiece(pieceIdx)}
                      className={`rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] flex items-center justify-center ${
                        isMovable ? 'cursor-pointer animate-bounce ring-2 ring-amber-400 ring-offset-2 z-30 scale-105' : ''
                      }`}
                    >
                      <div className="w-[70%] h-[70%] rounded-full relative overflow-hidden" style={{ backgroundColor: color }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent rounded-full" />
                      </div>
                      <div className="absolute top-[8%] left-[15%] w-[30%] h-[20%] rounded-full bg-white/60 blur-[1px] rotate-[-20deg]" />
                    </div>
                  );
                })}
              </div>
            )}

            </div> {/* end relative grid wrapper */}

          </div>

          {/* Bottom row: players + main dice */}
          <div className="flex items-center justify-between w-full max-w-[480px] px-1 pb-1 min-h-[60px]">
            <div>{blPlayer >= 0 && renderPlayerPanel(blPlayer)}</div>

            {/* Large main dice */}
            <div className="relative">
              {/* Glow ring behind dice on active turn */}
              {isMyTurn && !gameState.dice_rolled && !isSpinning && (
                <div className="absolute inset-[-6px] rounded-[28px] bg-amber-400/20 animate-pulse" />
              )}
              {isMyTurn ? (
                <button
                  onClick={handleDiceClick}
                  disabled={!isMyTurn || isSpinning || gameState.dice_rolled}
                  className={`w-[76px] h-[76px] bg-white rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8)] border-2 border-[#E6D5B8] flex items-center justify-center ${
                    isMyTurn && !gameState.dice_rolled && !isSpinning
                      ? 'active:scale-95 transition-transform cursor-pointer'
                      : ''
                  }`}
                >
                  <Dice value={gameState.dice} isRolling={isSpinning} className="scale-[1.4]" />
                </button>
              ) : gameState.dice !== null ? (
                /* Show rolled result for non-active players */
                <div className="w-[56px] h-[56px] bg-white/70 rounded-[18px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-[#E6D5B8]/50 flex items-center justify-center opacity-70">
                  <Dice value={gameState.dice} isRolling={false} className="scale-[1.0]" />
                </div>
              ) : (
                /* Empty placeholder to keep layout */
                <div className="w-[56px] h-[56px]" />
              )}
            </div>

            <div>{brPlayer >= 0 && renderPlayerPanel(brPlayer)}</div>
          </div>
        </div>
      </main>

      {/* ═══ CHAT BAR ═══ */}
      <footer className="px-3 pb-[clamp(4px,1vh,8px)] pt-1">
        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div className="mx-1 mb-1 max-h-[clamp(60px,8vh,100px)] overflow-y-auto rounded-xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-3 py-2 space-y-1 scrollbar-thin">
            {chatMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-tight">
                <span className={`font-bold whitespace-nowrap ${msg.player_id === localPlayerId ? 'text-amber-600' : 'text-slate-600'}`}>
                  {msg.player_name}:
                </span>
                <span className="text-slate-700 break-words min-w-0">{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
        <div className="flex items-center gap-2 bg-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.05)] px-4 py-[10px] mx-1">
          <button className="flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = chatInput.trim();
              if (trimmed) {
                onSendChat(trimmed);
                setChatInput('');
              }
            }}
            className="flex-1 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="پیام خود را بنویسید..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-[#2C2C2C] placeholder-[#9C9C9C] outline-none text-right"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="flex-shrink-0 disabled:opacity-30 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C17D3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </footer>

    </div>
  );
};

export default GameBoard;
