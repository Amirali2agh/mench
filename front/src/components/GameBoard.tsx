// front/src/components/GameBoard.tsx
// Ludo-style board composed of memoized static cells, yards, player panels
// and a WAAPI-driven piece layer (no per-step re-renders during movement).

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { GameState } from "../types";
import {
  getGridCoordinates,
} from "../utils/boardCoordinates";
import { getPieceHexColor } from "../utils/colors";
import Dice from "./Dice";
import { BoardCells } from "./game/BoardCells";
import { BaseYard } from "./game/BaseYard";
import { PlayerPanel } from "./game/PlayerPanel";
import { PieceLayer, RenderedPiece, HopAnim } from "./game/PieceLayer";
import type { ChatMessage } from "../hooks/useMenschSocket";

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

const TURN_TIMEOUT = 45;

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
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastRollSignatureRef = useRef<string | null>(null);
  const [visibleRoll, setVisibleRoll] = useState<{
    playerId: string;
    value: number;
  } | null>(null);
  const [rollingRollId, setRollingRollId] = useState<number | null>(null);

  useEffect(() => {
    const lastRoll = gameState?.last_roll;
    if (!lastRoll) {
      setVisibleRoll(null);
      return;
    }

    const signature = String(
      lastRoll.roll_id ?? `${lastRoll.player_id}:${lastRoll.value}`,
    );
    if (lastRollSignatureRef.current === signature) return;

    lastRollSignatureRef.current = signature;
    setVisibleRoll({ playerId: lastRoll.player_id, value: lastRoll.value });
    const rollId = lastRoll.roll_id ?? 0;
    setRollingRollId(rollId);
    const timer = window.setTimeout(
      () =>
        setRollingRollId((current) => (current === rollId ? null : current)),
      1300,
    );
    return () => window.clearTimeout(timer);
  }, [gameState?.last_roll?.roll_id]);

  // ═══ Piece positions & imperative hop animation ═══
  const realPositionsRef = useRef<Record<string, number>>({});
  const [visualPositions, setVisualPositions] = useState<
    Record<string, number>
  >({});
  const [hopRequest, setHopRequest] = useState<{ token: number; list: HopAnim[] }>({
    token: 0,
    list: [],
  });
  const [animInitialized, setAnimInitialized] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!gameState || !gameState.players || !gameState.pieces) {
    return (
      <div className="fixed inset-0 bg-[#F9F6F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const { players, current_turn, pieces, pieces_count } =
    gameState;
  const localPlayerIdx = players.findIndex((p) => p?.id === localPlayerId);
  const isMyTurn = current_turn === localPlayerIdx;
  const localDice = gameState.dice;

  const getVisualIdx = (backendIdx: number) => {
    return backendIdx;
  };

  const isPieceMovable = (pieceIdx: number): boolean => {
    if (!isMyTurn || !gameState.dice_rolled) return false;
    const myPieces = pieces[localPlayerId] || [];
    const currentPos = myPieces[pieceIdx];
    if (currentPos === undefined) return false;
    if (currentPos === -1 && localDice !== 6) return false;
    if (localDice && currentPos !== -1) {
      const targetPos = currentPos + localDice;
      if (targetPos > 43) return false;
      if (
        targetPos >= 40 &&
        myPieces.some(
          (position, index) => index !== pieceIdx && position === targetPos,
        )
      ) {
        return false;
      }
    }
    return true;
  };

  const autoActionRollRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isMyTurn || !gameState.dice_rolled || localDice === null) {
      autoActionRollRef.current = null;
      return;
    }

    const myPieces = pieces[localPlayerId] || [];
    const movablePieces = myPieces
      .map((_, pieceIdx) => pieceIdx)
      .filter(isPieceMovable);

    if (movablePieces.length !== 1) {
      autoActionRollRef.current = null;
      return;
    }

    const rollKey = `${current_turn}:${localDice}:${myPieces.join(",")}`;
    if (autoActionRollRef.current === rollKey) return;

    autoActionRollRef.current = rollKey;
    const timer = window.setTimeout(() => {
      onMovePiece(movablePieces[0]);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [
    current_turn,
    gameState.dice_rolled,
    isMyTurn,
    localDice,
    localPlayerId,
    onMovePiece,
    pieces,
  ]);

  const handleDiceClick = () => {
    if (!isMyTurn || isSpinning || gameState.dice_rolled) return;
    setIsSpinning(true);
    onRollDice();
  };

  useEffect(() => {
    if (
      isSpinning &&
      gameState.dice !== null
    ) {
      const timer = setTimeout(() => setIsSpinning(false), 1300);
      return () => clearTimeout(timer);
    }
  }, [isSpinning, gameState.dice]);

  // ═══ Silent 45s turn countdown (no per-tick re-renders; ring self-ticks) ═══
  const turnDeadlineRef = useRef<number>(Infinity);
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasActedRef = useRef(false);

  useEffect(() => {
    hasActedRef.current = false;
    setIsSpinning(false);
  }, [gameState?.current_turn, gameState?.status]);

  // ═══ Board measurement for piece positioning ═══
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellPitch, setCellPitch] = useState(0);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const grid = board.querySelector(".grid");
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      setCellPitch(rect.width / 11);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    return () => ro.disconnect();
  }, []);

  // Detect server-side piece movements; animate forward track moves imperatively.
  useEffect(() => {
    if (!gameState?.pieces || !players.length) return;

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

    type Move = { key: string; vIdx: number; pieceIdx: number; from: number; to: number };
    const moves: Move[] = [];
    players.forEach((player, playerIdx) => {
      if (!player) return;
      const vIdx = getVisualIdx(playerIdx);
      const playerPieces = pieces[player.id] || [];
      for (let i = 0; i < (pieces_count || 4); i++) {
        const newPos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
        const key = `${player.id}-${i}`;
        const oldPos = realPositionsRef.current[key];
        if (oldPos !== undefined && oldPos !== newPos) {
          moves.push({ key, vIdx, pieceIdx: i, from: oldPos, to: newPos });
        }
      }
    });

    if (moves.length > 0) {
      const hops: HopAnim[] = [];
      setVisualPositions((prev) => {
        const next = { ...prev };
        for (const m of moves) {
          next[m.key] = m.from >= 0 && m.to > m.from ? m.from : m.to;
        }
        return next;
      });
      for (const m of moves) {
        if (m.from >= 0 && m.to > m.from) {
          hops.push({
            key: m.key,
            vIdx: m.vIdx,
            pieceIdx: m.pieceIdx,
            from: m.from,
            to: m.to,
          });
        }
      }
      if (hops.length > 0) {
        setHopRequest((prev) => ({ token: prev.token + 1, list: hops }));
      }
    }

    players.forEach((player) => {
      if (!player) return;
      const playerPieces = pieces[player.id] || [];
      for (let i = 0; i < (pieces_count || 4); i++) {
        const key = `${player.id}-${i}`;
        realPositionsRef.current[key] =
          playerPieces[i] !== undefined ? playerPieces[i] : -1;
      }
    });
  }, [gameState?.pieces]);

  const handleHopComplete = useCallback((key: string, finalPos: number) => {
    setVisualPositions((prev) =>
      prev[key] === finalPos ? prev : { ...prev, [key]: finalPos },
    );
  }, []);

  useEffect(() => {
    if (gameState?.dice_rolled || gameState?.dice !== null) {
      hasActedRef.current = true;
    }
  }, [gameState?.dice_rolled, gameState?.dice]);

  useEffect(() => {
    if (gameState?.status !== "playing") return;

    turnDeadlineRef.current = Date.now() + TURN_TIMEOUT * 1000;
    turnTimerRef.current = setInterval(() => {
      if (Date.now() < turnDeadlineRef.current) return;
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
      if (current_turn === localPlayerIdx && !hasActedRef.current) {
        onPassTurn();
      }
    }, 1000);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [gameState?.current_turn, gameState?.status, current_turn, localPlayerIdx, onPassTurn]);

  const getColorForVisualIdx = (vIdx: number): string => getPieceHexColor(vIdx);

  const getPlayerPanelPosition = (
    playerIdx: number,
  ): "tl" | "tr" | "bl" | "br" | null => {
    const vIdx = getVisualIdx(playerIdx);
    const map: Record<number, "tl" | "tr" | "bl" | "br"> = {
      2: "tl", // green → top-left
      1: "tr", // blue → top-right
      3: "bl", // yellow → bottom-left
      0: "br", // red → bottom-right
    };
    return map[vIdx] || null;
  };

  const buildYardProps = (vIdx: number) => {
    const ownerIdx = players.findIndex((_, i) => getVisualIdx(i) === vIdx);
    const isOwned = ownerIdx !== -1;
    let slotsBitmask = 0;
    let movableBitmask = 0;
    if (isOwned) {
      const ownerId = players[ownerIdx].id;
      const ownerPieces = pieces[ownerId] || [];
      for (let i = 0; i < (pieces_count || 4); i++) {
        if (ownerPieces[i] === -1) {
          slotsBitmask |= 1 << i;
          if (
            ownerIdx === localPlayerIdx &&
            isMyTurn &&
            localDice === 6 &&
            gameState.dice_rolled
          ) {
            movableBitmask |= 1 << i;
          }
        }
      }
    }
    return {
      vIdx,
      owned: isOwned,
      active: isOwned && current_turn === ownerIdx,
      color: getColorForVisualIdx(vIdx),
      slotsBitmask,
      movableBitmask,
      onMovePiece,
    };
  };

  const renderPlayerPanel = (playerIdx: number) => {
    const pos = getPlayerPanelPosition(playerIdx);
    if (!pos || !players[playerIdx]) return null;
    const p = players[playerIdx];
    const vIdx = getVisualIdx(playerIdx);
    const isTurn = current_turn === playerIdx;

    const diceElement =
      visibleRoll?.playerId === p.id ? (
        <Dice
          key={`${p.id}-${gameState.last_roll?.roll_id ?? "legacy"}`}
          value={
            isTurn && gameState.dice_rolled && gameState.dice !== null
              ? gameState.dice
              : visibleRoll.value
          }
          isRolling={
            rollingRollId === (gameState.last_roll?.roll_id ?? 0) ||
            (isTurn && isSpinning)
          }
          rollId={gameState.last_roll?.roll_id}
        />
      ) : null;

    return (
      <PlayerPanel
        name={p.name}
        avatar={p.avatar}
        color={getColorForVisualIdx(vIdx)}
        isTurn={isTurn}
        turnKey={current_turn}
        reverse={pos === "tr" || pos === "br"}
        dice={diceElement}
      />
    );
  };

  // ═══ Build rendered piece list (one-pass stacking offsets) ═══
  interface BoardPieceEntry extends RenderedPiece {
    pos: number;
  }
  const allRenderedPieces: BoardPieceEntry[] = [];
  players.forEach((player, playerIdx) => {
    if (!player) return;
    const vIdx = getVisualIdx(playerIdx);
    const playerPieces = pieces[player.id] || [];
    for (let i = 0; i < (pieces_count || 4); i++) {
      const realPos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
      const key = `${player.id}-${i}`;
      const visualPos = visualPositions[key] ?? realPos;
      const coord = getGridCoordinates(vIdx, visualPos, i);
      allRenderedPieces.push({
        key,
        vIdx,
        playerId: player.id,
        pieceIdx: i,
        pos: realPos,
        visualPos,
        coord,
        overlap: 0,
        stackIndex: 0,
        movable: false,
      });
    }
  });

  const stackTotals = new Map<string, number>();
  for (const p of allRenderedPieces) {
    const coordKey = `${p.coord.r},${p.coord.c}`;
    stackTotals.set(coordKey, (stackTotals.get(coordKey) || 0) + 1);
  }
  const stackSeen = new Map<string, number>();
  const boardPieces: BoardPieceEntry[] = [];
  for (const p of allRenderedPieces) {
    if (p.visualPos < 0) continue;
    const coordKey = `${p.coord.r},${p.coord.c}`;
    const total = stackTotals.get(coordKey) || 1;
    const index = stackSeen.get(coordKey) || 0;
    stackSeen.set(coordKey, index + 1);
    boardPieces.push({
      ...p,
      overlap: total > 1 ? (index - (total - 1) / 2) * 5 : 0,
      stackIndex: index,
      movable:
        p.playerId === localPlayerId && isPieceMovable(p.pieceIdx),
    });
  }

  const tlPlayer = players.findIndex((_, i) => getVisualIdx(i) === 2);
  const trPlayer = players.findIndex((_, i) => getVisualIdx(i) === 1);
  const blPlayer = players.findIndex((_, i) => getVisualIdx(i) === 3);
  const brPlayer = players.findIndex((_, i) => getVisualIdx(i) === 0);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F9F6F0] font-sans overflow-hidden select-none">
      {/* ═══ TOP HEADER ═══ */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={onLeave}
          className="w-[44px] h-[44px] bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.05)] flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#333"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <div className="bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.04)] px-6 py-2">
          <span className="text-[15px] font-bold text-[#2C2C2C]">
            منچ آنلاین
          </span>
        </div>

        <div className="w-[44px] h-[44px] bg-white rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.05)] flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="#D4A373"
            stroke="none"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </header>

      {/* ═══ MAIN AREA: Player panels + Board + Dice ═══ */}
      <main className="flex-1 flex flex-col overflow-hidden px-2">
        {/* Top players row */}
        <div className="grid grid-cols-2 items-start w-full max-w-[480px] mx-auto px-1 pt-1 pb-1 min-h-[52px]">
          <div className="flex justify-start">
            {tlPlayer >= 0 && renderPlayerPanel(tlPlayer)}
          </div>
          <div className="flex justify-end">
            {trPlayer >= 0 && renderPlayerPanel(trPlayer)}
          </div>
        </div>

        {/* Board + Bottom players */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-0">
          {/* Board */}
          <div
            ref={boardRef}
            className="relative w-[min(88vw,78vh)] aspect-square max-w-[480px] bg-[#FAF4E6] rounded-[clamp(16px,3vmin,28px)] p-[clamp(8px,1.5vmin,16px)] shadow-[0_16px_36px_rgba(0,0,0,0.08),inset_0_2px_6px_rgba(255,255,255,0.6)] border-[clamp(2px,0.4vmin,4px)] border-[#E8D3B0] flex items-center justify-center"
          >
            <div className="relative w-full h-full">
              <div className="grid grid-cols-11 grid-rows-11 gap-[0.35vmin] w-full h-full relative">
                {/* Yards */}
                <div className="col-start-1 col-end-5 row-start-1 row-end-5 p-[0.3vmin]">
                  <BaseYard {...buildYardProps(2)} />
                </div>{" "}
                {/* TL: green */}
                <div className="col-start-8 col-end-12 row-start-1 row-end-5 p-[0.3vmin]">
                  <BaseYard {...buildYardProps(1)} />
                </div>{" "}
                {/* TR: blue */}
                <div className="col-start-1 col-end-5 row-start-8 row-end-12 p-[0.3vmin]">
                  <BaseYard {...buildYardProps(3)} />
                </div>{" "}
                {/* BL: red */}
                <div className="col-start-8 col-end-12 row-start-8 row-end-12 p-[0.3vmin]">
                  <BaseYard {...buildYardProps(0)} />
                </div>{" "}
                {/* BR: green */}
                <BoardCells />
              </div>

              {/* ═══ Animated piece overlay ═══ */}
              {cellPitch > 0 && boardPieces.length > 0 && (
                <PieceLayer
                  pieces={boardPieces}
                  cellPitch={cellPitch}
                  hops={hopRequest.list}
                  hopsToken={hopRequest.token}
                  onHopComplete={handleHopComplete}
                  onMovePiece={onMovePiece}
                />
              )}
            </div>
          </div>

          {/* Bottom row: players + roll control (Fixed Centering with 3-column Grid) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-[480px] px-1 pb-1 min-h-[60px]">
            <div className="flex justify-start">
              {blPlayer >= 0 && renderPlayerPanel(blPlayer)}
            </div>

            {/* Roll control */}
            <div className="flex justify-center relative">
              {isMyTurn && !gameState.dice_rolled && !isSpinning && (
                <div className="absolute inset-[-4px] rounded-full bg-amber-400/20 animate-pulse" />
              )}
              {isMyTurn ? (
                <button
                  onClick={handleDiceClick}
                  disabled={!isMyTurn || isSpinning || gameState.dice_rolled}
                  aria-label="Roll dice"
                  className={`relative min-w-[104px] h-[48px] px-6 rounded-full bg-[#C17D3C] text-white font-bold text-[15px] shadow-[0_8px_18px_rgba(193,125,60,0.28)] border-2 border-[#D99A5C] flex items-center justify-center ${
                    isMyTurn && !gameState.dice_rolled && !isSpinning
                      ? "hover:bg-[#AE6C31] active:scale-95 transition-transform cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {isSpinning ? "Rolling..." : "Roll"}
                </button>
              ) : (
                <div className="w-[56px] h-[56px]" />
              )}
            </div>

            <div className="flex justify-end">
              {brPlayer >= 0 && renderPlayerPanel(brPlayer)}
            </div>
          </div>
        </div>
      </main>

      {/* ═══ CHAT BAR ═══ */}
      <footer className="px-3 pb-[clamp(4px,1vh,8px)] pt-1">
        {chatMessages.length > 0 && (
          <div className="mx-1 mb-1 max-h-[clamp(60px,8vh,100px)] overflow-y-auto rounded-xl bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-3 py-2 space-y-1 scrollbar-thin">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[11px] leading-tight"
              >
                <span
                  className={`font-bold whitespace-nowrap ${msg.player_id === localPlayerId ? "text-amber-600" : "text-slate-600"}`}
                >
                  {msg.player_name}:
                </span>
                <span className="text-slate-700 break-words min-w-0">
                  {msg.message}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
        <div className="flex items-center gap-2 bg-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.05)] px-4 py-[10px] mx-1">
          <button className="flex-shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5C5C5C"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
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
                setChatInput("");
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
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C17D3C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
