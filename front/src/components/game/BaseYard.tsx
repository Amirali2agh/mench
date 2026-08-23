import React from "react";
import { playerColors } from "../../utils/colors";

interface BaseYardProps {
  vIdx: number;
  owned: boolean;
  active: boolean;
  color: string;
  slotsBitmask: number;
  movableBitmask: number;
  onMovePiece: (pieceIdx: number) => void;
}

const BaseYardInner: React.FC<BaseYardProps> = ({
  vIdx,
  owned,
  active,
  color,
  slotsBitmask,
  movableBitmask,
  onMovePiece,
}) => {
  const theme = playerColors[vIdx];
  if (!theme) return null;

  return (
    <div
      className={`w-full h-full rounded-[clamp(8px,1.5vmin,18px)] ${theme.bg} border-[clamp(1px,0.2vmin,2.5px)] ${
        active
          ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
          : "border-white/20"
      } ${!owned ? "opacity-30 grayscale" : ""} flex items-center justify-center relative shadow-[inset_0_4px_10px_rgba(0,0,0,0.15)] transition-[border-color,box-shadow,filter,opacity] duration-300`}
    >
      <div className="grid grid-cols-2 grid-rows-2 gap-[clamp(3px,0.5vmin,8px)] p-[clamp(4px,0.8vmin,12px)] w-full h-full">
        {Array.from({ length: 4 }).map((_, idx) => {
          const slotTaken = (slotsBitmask & (1 << idx)) !== 0;
          const isMovablePiece = (movableBitmask & (1 << idx)) !== 0;
          return (
            <div
              key={idx}
              className="w-full h-full rounded-full bg-black/15 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3)] border border-white/5 flex items-center justify-center relative"
            >
              {slotTaken && (
                <div
                  onClick={() => isMovablePiece && onMovePiece(idx)}
                  className={`w-[80%] h-[80%] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] flex items-center justify-center relative ${
                    isMovablePiece
                      ? "cursor-pointer animate-bounce ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent z-30 scale-105"
                      : ""
                  }`}
                >
                  <div
                    className="w-[70%] h-[70%] rounded-full relative overflow-hidden"
                    style={{ backgroundColor: color }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent rounded-full" />
                  </div>
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

export const BaseYard = React.memo(BaseYardInner);
