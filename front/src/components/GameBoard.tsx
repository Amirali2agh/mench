// front/src/components/GameBoard.tsx

import React, { useState } from 'react';
import { GameState } from '../types';
import { playerColors } from '../utils/colors';
import { getGridCoordinates, getArrowRotation, GridCoord } from '../utils/boardCoordinates';
import Dice from './Dice';

interface GameBoardProps {
  gameState: GameState;
  localPlayerId: string;
  onRollDice: () => void;
  onMovePiece: (pieceIndex: number) => void;
  onLeave: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  localPlayerId,
  onRollDice,
  onMovePiece,
  onLeave,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);

  if (!gameState || !gameState.players || !gameState.pieces) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
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

  const allRenderedPieces: { playerIdx: number; vIdx: number; playerId: string; pieceIdx: number; pos: number; coord: GridCoord }[] = [];
  players.forEach((player, playerIdx) => {
    if (!player) return;
    const vIdx = getVisualIdx(playerIdx);
    const playerPieces = pieces[player.id] || [];
    for (let i = 0; i < (pieces_count || 4); i++) {
      const pos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
      const coord = getGridCoordinates(vIdx, pos, i);
      allRenderedPieces.push({ playerIdx, vIdx, playerId: player.id, pieceIdx: i, pos, coord });
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
    
    setTimeout(() => {
      setIsSpinning(false);
    }, 600);
  };

  const renderBaseYard = (vIdx: number) => {
    const theme = playerColors[vIdx];
    if (!theme) return null;

    const ownerIdx = players.findIndex((_, i) => getVisualIdx(i) === vIdx);
    const isOwned = ownerIdx !== -1;
    const isPlayerActive = isOwned && current_turn === ownerIdx;

    return (
      <div className={`w-full h-full rounded-full ${theme.bg} border-2 ${isPlayerActive ? 'border-amber-400 animate-pulse' : 'border-slate-800/60'} ${!isOwned ? 'opacity-30 grayscale' : ''} flex items-center justify-center relative shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] transition-all duration-300`}>
        <div className="grid grid-cols-2 grid-rows-2 gap-[clamp(2px,0.5vmin,6px)] p-[clamp(4px,1vmin,10px)] w-4/5 h-4/5 bg-black/10 rounded-full">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-full h-full rounded-full bg-black/35 border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2d1b11] via-[#1a0f0a] to-[#0f0805] select-none font-sans">
      <div className="relative w-[min(92vw,92vh)] aspect-square max-w-[500px] bg-slate-100 rounded-[clamp(8px,2vmin,16px)] p-[1.5vmin] shadow-[0_25px_60px_rgba(0,0,0,0.7)] border-[clamp(2px,0.5vmin,4px)] border-stone-200/90 flex items-center justify-center">
        
        {/* Current player name label - top center */}
        <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white whitespace-nowrap leading-tight">
          {players[current_turn]?.name || `بازیکن ${current_turn + 1}`}
        </div>

        {/* Leave button - top right */}
        <button
          onClick={onLeave}
          className="absolute top-[-8px] right-[-8px] w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center z-50 active:scale-90 hover:bg-black/80 transition-all"
          title="خروج از بازی"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 11x11 board grid */}
        <div className="grid grid-cols-11 grid-rows-11 gap-[0.4vmin] w-full h-full relative">
          
          {renderBaseYard(2) ? <div className="col-start-1 col-end-5 row-start-1 row-end-5 p-[0.3vmin]">{renderBaseYard(2)}</div> : null}
          {renderBaseYard(0) ? <div className="col-start-8 col-end-12 row-start-1 row-end-5 p-[0.3vmin]">{renderBaseYard(0)}</div> : null}
          {renderBaseYard(3) ? <div className="col-start-1 col-end-5 row-start-8 row-end-12 p-[0.3vmin]">{renderBaseYard(3)}</div> : null}
          {renderBaseYard(1) ? <div className="col-start-8 col-end-12 row-start-8 row-end-12 p-[0.3vmin]">{renderBaseYard(1)}</div> : null}

          <div className="absolute inset-0 bg-[#e5e5e5]/40 rounded-xl pointer-events-none -z-10" />

          {Array.from({ length: 11 }).map((_, rIdx) => {
            return Array.from({ length: 11 }).map((_, cIdx) => {
              if (rIdx < 4 && cIdx < 4) return null;
              if (rIdx < 4 && cIdx >= 7) return null;
              if (rIdx >= 7 && cIdx < 4) return null;
              if (rIdx >= 7 && cIdx >= 7) return null;

              if (rIdx === 5 && cIdx === 5) {
                return (
                  <div key={`cell-${rIdx}-${cIdx}`} className="col-start-6 col-end-7 row-start-6 row-end-7 bg-slate-200/35 rounded-xl flex items-center justify-center relative">
                    <div className="w-full h-full rounded-full bg-slate-300/40 border border-slate-400/20" />
                  </div>
                );
              }

              let customBg = 'bg-white';
              let isHomeStretch = false;
              
              if (cIdx === 5 && rIdx >= 1 && rIdx <= 4) { customBg = 'bg-red-500'; isHomeStretch = true; }
              else if (rIdx === 5 && cIdx >= 6 && cIdx <= 9) { customBg = 'bg-blue-500'; isHomeStretch = true; }
              else if (rIdx === 5 && cIdx >= 1 && cIdx <= 4) { customBg = 'bg-green-500'; isHomeStretch = true; }
              else if (rIdx === 5 && cIdx >= 6 && cIdx <= 9) { customBg = 'bg-yellow-500'; isHomeStretch = true; }

              if (rIdx === 0 && cIdx === 6) customBg = 'bg-red-500';
              else if (rIdx === 6 && cIdx === 10) customBg = 'bg-blue-500';
              else if (rIdx === 4 && cIdx === 0) customBg = 'bg-green-500';
              else if (rIdx === 10 && cIdx === 4) customBg = 'bg-yellow-500';

              const arrowRotation = getArrowRotation({ r: rIdx, c: cIdx });

              return (
                <div
                  key={`cell-${rIdx}-${cIdx}`}
                  style={{ gridRowStart: rIdx + 1, gridColumnStart: cIdx + 1 }}
                  className={`rounded-full border border-slate-400/70 shadow-[0_1px_3px_rgba(0,0,0,0.15)] flex items-center justify-center relative transition-all duration-300 ${customBg} aspect-square p-[0.2vmin]`}
                >
                  {!isHomeStretch && (
                    <svg className={`w-3/5 h-3/5 ${customBg === 'bg-white' ? 'text-slate-400/80' : 'text-white/90'} ${arrowRotation}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              );
            });
          })}

          {/* Center dice - interactive roll button */}
          <div 
            onClick={handleDiceClick}
            className={`col-start-6 col-end-7 row-start-6 row-end-7 z-40 place-self-center flex items-center justify-center transition-all duration-300 ${
              isMyTurn && !gameState.dice_rolled && !isSpinning ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
            }`}
          >
            <Dice value={gameState.dice} isRolling={isSpinning} />
          </div>

          {/* Render all game pieces */}
          {allRenderedPieces.map(({ vIdx, playerId: pId, pieceIdx, coord }) => {
            const theme = playerColors[vIdx];
            if (!theme) return null;
            
            const isMovable = pId === localPlayerId && isPieceMovable(pieceIdx);

            const piecesInSameCoord = allRenderedPieces.filter(
              (p) => p.coord.r === coord.r && p.coord.c === coord.c
            );
            const pieceIndexInSameCoord = piecesInSameCoord.findIndex(
              (p) => p.playerId === pId && p.pieceIdx === pieceIdx
            );

            const transformStyle = piecesInSameCoord.length > 1
              ? {
                  transform: `translate(${(pieceIndexInSameCoord - (piecesInSameCoord.length - 1) / 2) * 6}px, ${(pieceIndexInSameCoord - (piecesInSameCoord.length - 1) / 2) * -6}px)`,
                  zIndex: 20 + pieceIndexInSameCoord,
                }
              : { zIndex: 10 };

            return (
              <div
                key={`piece-${pId}-${pieceIdx}`}
                style={{
                  gridRowStart: coord.r + 1,
                  gridColumnStart: coord.c + 1,
                  ...transformStyle,
                }}
                onClick={() => isMovable && onMovePiece(pieceIdx)}
                className={`w-[85%] h-[85%] place-self-center rounded-full border-2 ${theme.piece} ${theme.pieceBorder} flex items-center justify-center shadow-md transition-all duration-300 ${
                  isMovable ? 'cursor-pointer animate-bounce border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.8)] z-30 scale-105' : ''
                }`}
              >
                <div className="w-1/3 h-1/4 rounded-full bg-white/40 shadow-inner" />
              </div>
            );
          })}
        </div>

        {/* Turn indicator dots - bottom center */}
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
          {players.map((p, idx) => {
            const vIdx = getVisualIdx(idx);
            return (
              <div
                key={p.id}
                className={`w-2.5 h-2.5 rounded-full border border-white/30 shadow-sm ${
                  playerColors[vIdx] ? playerColors[vIdx].piece : 'bg-slate-700'
                } ${current_turn === idx ? 'scale-150 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900' : 'opacity-60'}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
