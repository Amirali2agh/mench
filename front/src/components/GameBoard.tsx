// front/src/components/GameBoard.tsx

import React from 'react';
import { GameState } from '../types';
import { playerColors } from '../utils/colors';
import { getGridCoordinates, getArrowRotation, GridCoord } from '../utils/boardCoordinates';
import Dice from './Dice';

interface GameBoardProps {
  gameState: GameState;
  localPlayerId: string; // متغیر هماهنگ شده با App.tsx شما
  onRollDice: () => void;
  onMovePiece: (pieceIndex: number) => void;
  onRestartGame: () => void;
  onLeave: () => void;       // متغیر هماهنگ شده با App.tsx شما
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  localPlayerId,
  onRollDice,
  onMovePiece,
  onRestartGame,
  onLeave,
}) => {
  const { players, current_turn, pieces, pieces_count } = gameState;

  // پیدا کردن نوبت بازیکن محلی
  const localPlayerIdx = players.findIndex((p) => p.id === localPlayerId);
  const isMyTurn = current_turn === localPlayerIdx;

  // آماده‌سازی کل مهره‌های روی صفحه
  const allRenderedPieces: { playerIdx: number; playerId: string; pieceIdx: number; pos: number; coord: GridCoord }[] = [];
  players.forEach((player, playerIdx) => {
    const playerPieces = pieces[player.id] || [];
    for (let i = 0; i < pieces_count; i++) {
      const pos = playerPieces[i] !== undefined ? playerPieces[i] : -1;
      const coord = getGridCoordinates(playerIdx, pos, i);
      allRenderedPieces.push({ playerIdx, playerId: player.id, pieceIdx: i, pos, coord });
    }
  });

  // تابع بررسی قابلیت حرکت مهره‌ها برای فعال‌سازی انیمیشن
  const isPieceMovable = (pieceIdx: number): boolean => {
    if (!isMyTurn || !gameState.dice_rolled) return false;
    const myPieces = pieces[localPlayerId] || [];
    const currentPos = myPieces[pieceIdx];

    if (currentPos === -1 && gameState.dice !== 6) return false;
    if (gameState.dice && currentPos !== -1 && currentPos + gameState.dice > 44) return false;

    return true;
  };

  // رندر دایره‌های بزرگ پایگاه‌ها (Yards) مطابق تصویر
  const renderBaseYard = (playerIdx: number) => {
    const theme = playerColors[playerIdx];
    const isPlayerActive = current_turn === playerIdx;

    return (
      <div 
        className={`w-full h-full rounded-full ${theme.bg} border-2 ${isPlayerActive ? 'border-amber-400 animate-pulse' : 'border-slate-800/60'} flex items-center justify-center relative shadow-[inset_0_4px_8px_rgba(0,0,0,0.3),_0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-300`}
      >
        {/* ۴ خانه داخلی پایگاه برای قرارگیری مهره‌ها */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 p-2.5 w-4/5 h-4/5 bg-black/10 rounded-full">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-full h-full rounded-full bg-black/35 border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[url('https://images.unsplash.com/photo-1541123437800-1bb1317bec14?q=80&w=600')] bg-cover bg-center select-none overflow-x-hidden font-sans relative pb-4">
      {/* لایه تیره روی پس‌زمینه برای عمق دادن به چوب */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none z-0" />

      {/* لوگوی LUDO بالای صفحه بر اساس تصویر */}
      <header className="w-full pt-6 text-center z-10">
        <h1 className="text-5xl font-extrabold tracking-widest drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] flex justify-center gap-1.5 font-serif select-none">
      <h1 dir="ltr" className="text-5xl font-extrabold tracking-widest drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] flex justify-center gap-1.5 font-serif select-none"></h1>   
          <span className="text-orange-400">L</span>
          <span className="text-orange-400">A</span>
          <span className="text-orange-500">H</span>
          <span className="text-orange-600">G</span>
          <span className="text-orange-700">E</span>         
          <span className="text-orange-700">T</span>
          <span className="text-orange-600">R</span>
          <span className="text-orange-500">O</span>
          <span className="text-orange-400">P</span>

        </h1>
      </header>

      {/* کانتینر بورد بازی - کاملاً منطبق بر تصویر و Mobile-First با حاشیه‌های نرم */}
      <main className="flex-1 flex items-center justify-center p-3 z-10 my-auto">
        <div className="max-w-[430px] w-full aspect-square bg-slate-100 rounded-2xl p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border-4 border-stone-200/90 relative flex items-center justify-center">
          
          <div className="grid grid-cols-11 grid-rows-11 gap-0.5 w-full h-full relative">
            
            {/* حیاط‌های دایره‌ای بازیکنان */}
            <div className="col-start-1 col-end-5 row-start-1 row-end-5 p-0.5">{renderBaseYard(2)}</div> {/* سبز (بالا-چپ) */}
            <div className="col-start-8 col-end-12 row-start-1 row-end-5 p-0.5">{renderBaseYard(0)}</div> {/* قرمز (بالا-راست) */}
            <div className="col-start-1 col-end-5 row-start-8 row-end-12 p-0.5">{renderBaseYard(3)}</div> {/* زرد (پایین-چپ) */}
            <div className="col-start-8 col-end-12 row-start-8 row-end-12 p-0.5">{renderBaseYard(1)}</div> {/* آبی (پایین-راست) */}

            {/* بستر پس‌زمینه خاکستری ملایم بورد تفکیکی طبق تصویر */}
            <div className="absolute inset-0 bg-[#e5e5e5]/40 rounded-xl pointer-events-none -z-10" />

            {/* رندر خانه‌ها با ظاهر دایره‌ای و بردارهای فلش جهت‌نما */}
            {Array.from({ length: 11 }).map((_, rIdx) => {
              return Array.from({ length: 11 }).map((_, cIdx) => {
                if (rIdx < 4 && cIdx < 4) return null;
                if (rIdx < 4 && cIdx >= 7) return null;
                if (rIdx >= 7 && cIdx < 4) return null;
                if (rIdx >= 7 && cIdx >= 7) return null;

                // خانه وسط (GOAL) برای فرود آمدن تاس
                if (rIdx === 5 && cIdx === 5) {
                  return (
                    <div 
                      key={`cell-${rIdx}-${cIdx}`} 
                      className="col-start-6 col-end-7 row-start-6 row-end-7 bg-slate-200/35 rounded-xl flex items-center justify-center relative"
                    >
                      <div className="w-full h-full rounded-full bg-slate-300/40 border border-slate-400/20" />
                    </div>
                  );
                }

                // پالت‌های هوم‌استرچ دایره‌ای رنگی (دایره‌های توپر بر خلاف حالت مستطیلی قبل)
                let customBg = 'bg-white';
                let isHomeStretch = false;
                
                if (cIdx === 5 && rIdx >= 1 && rIdx <= 4) { customBg = 'bg-red-500'; isHomeStretch = true; }       // ستون امن قرمز
                else if (rIdx === 5 && cIdx >= 6 && cIdx <= 9) { customBg = 'bg-blue-500'; isHomeStretch = true; }  // ستون امن آبی
                else if (rIdx === 5 && cIdx >= 1 && cIdx <= 4) { customBg = 'bg-green-500'; isHomeStretch = true; } // ستون امن سبز
                else if (cIdx === 5 && rIdx >= 6 && rIdx <= 9) { customBg = 'bg-yellow-500'; isHomeStretch = true; }// ستون امن زرد

                // خانه‌های شروع حرکت رنگی (شروع‌های اختصاصی ۴ بازیکن)
                if (rIdx === 0 && cIdx === 6) customBg = 'bg-red-500';
                else if (rIdx === 6 && cIdx === 10) customBg = 'bg-blue-500';
                else if (rIdx === 4 && cIdx === 0) customBg = 'bg-green-500';
                else if (rIdx === 10 && cIdx === 4) customBg = 'bg-yellow-500';

                const arrowRotation = getArrowRotation({ r: rIdx, c: cIdx });

                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    style={{ gridRowStart: rIdx + 1, gridColumnStart: cIdx + 1 }}
                    className={`rounded-full border border-slate-400/70 shadow-[0_1px_3px_rgba(0,0,0,0.15)] flex items-center justify-center relative transition-all duration-300 ${customBg} aspect-square p-0.5`}
                  >
                    {!isHomeStretch && (
                      <svg 
                        className={`w-3/5 h-3/5 ${customBg === 'bg-white' ? 'text-slate-400/80' : 'text-white/90'} ${arrowRotation}`} 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        {/* فلش‌های جهت‌نمای مثلثی توخالی بر اساس تصویر شما */}
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                );
              });
            })}

            {/* تاس سه‌بعدی فوق‌العاده زیبا در خانه وسط زمین بر اساس تصویر */}
            <div 
              onClick={() => isMyTurn && !gameState.dice_rolled && onRollDice()}
              className="absolute col-start-5 col-end-8 row-start-5 row-end-8 z-40 flex items-center justify-center cursor-pointer"
            >
              <Dice 
                value={gameState.dice} 
                isRolling={gameState.dice_rolled} 
              />
            </div>

            {/* مهره‌های بازی دایره‌ای با رندر اتمیک بر روی خانه‌ها */}
            {allRenderedPieces.map(({ playerIdx, playerId: pId, pieceIdx, pos, coord }) => {
              const theme = playerColors[playerIdx];
              const isMovable = pId === localPlayerId && isPieceMovable(pieceIdx);

              const piecesInSameCoord = allRenderedPieces.filter(
                (p) => p.coord.r === coord.r && p.coord.c === coord.c
              );
              const pieceIndexInSameCoord = piecesInSameCoord.findIndex(
                (p) => p.playerId === pId && p.pieceIdx === pieceIdx
              );

              const transformStyle = piecesInSameCoord.length > 1
                ? {
                    transform: `translate(${(pieceIndexInSameCoord - (piecesInSameCoord.length - 1) / 2) * 8}px, ${(pieceIndexInSameCoord - (piecesInSameCoord.length - 1) / 2) * -8}px)`,
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
                  className={`w-3/4 h-3/4 place-self-center rounded-full border-2 ${theme.piece} ${theme.pieceBorder} flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer ${
                    isMovable ? 'animate-bounce border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.8)] z-30 scale-105' : ''
                  }`}
                >
                  {/* نقطه فرو رفته مرکز مهره مطابق با عکس بازی شما */}
                  <div className="w-1/3 h-1/4 rounded-full bg-white/40 shadow-inner" />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* فوتر چوبی پایین صفحه موبایل هماهنگ با تصویر تخته نرد و منچ */}
      <footer className="w-full flex flex-col items-center gap-3 px-6 z-10">
        
        {/* ردیف ۴ دایره رنگی بازیکنان در بالای کنترلر */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div 
              key={idx} 
              className={`w-5.5 h-5.5 rounded-full border border-white/20 shadow-md ${
                players[idx] ? playerColors[idx]?.piece : 'bg-slate-700/50'
              } ${current_turn === idx ? 'scale-110 border-amber-400 ring-2 ring-amber-400/40' : ''}`}
            />
          ))}
        </div>

        {/* داک کنترلر شیشه‌ای مشکی پایین صفحه بر اساس تصویر */}
        <div className="w-full max-w-[390px] flex justify-between items-center bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
          
          {/* بخش نام بازیکن فعال با هایلایت آبی رنگ */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 bg-slate-900/90 rounded-lg border-2 ${
              isMyTurn ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-slate-800'
            }`}>
              <span className="text-sm font-bold text-slate-100">
                {players[current_turn]?.name || `Player ${current_turn + 1}`}
              </span>
            </div>
          </div>

          {/* بخش دکمه پاوز و مقدار تاس عددی */}
          <div className="flex items-center gap-4">
            {/* نمایش عدد تاس */}
            <div className="w-10 h-10 rounded-lg bg-slate-900/90 flex items-center justify-center border border-white/10 text-white font-extrabold text-lg">
              {gameState.dice !== null ? gameState.dice : '-'}
            </div>

            {/* دکمه Pause دوخطی سفید مطابق با تصویر */}
            <button 
              onClick={onLeave}
              className="w-10 h-10 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/10 active:scale-95 transition flex items-center justify-center gap-1"
            >
              <div className="w-1.5 h-4 bg-white rounded-full" />
              <div className="w-1.5 h-4 bg-white rounded-full" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};