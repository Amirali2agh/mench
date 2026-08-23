import React from "react";
import { getArrowRotation } from "../../utils/boardCoordinates";

const CELL_CLASS =
  "rounded-full border flex items-center justify-center relative aspect-square p-[0.15vmin]";

function buildCell(rIdx: number, cIdx: number): React.ReactNode | null {
  if (rIdx < 4 && cIdx < 4) return null;
  if (rIdx < 4 && cIdx >= 7) return null;
  if (rIdx >= 7 && cIdx < 4) return null;
  if (rIdx >= 7 && cIdx >= 7) return null;

  if (rIdx === 5 && cIdx === 5) {
    return (
      <div
        key={`cell-${rIdx}-${cIdx}`}
        className="col-start-6 col-end-7 row-start-6 row-end-7 flex items-center justify-center relative"
      >
        <div className="w-full h-full rounded-lg overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[clamp(8px,1.5vmin,18px)] border-r-[clamp(8px,1.5vmin,18px)] border-b-[clamp(8px,1.5vmin,18px)] border-l-transparent border-r-transparent border-b-[#277DA1]/40" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[clamp(8px,1.5vmin,18px)] border-b-[clamp(8px,1.5vmin,18px)] border-l-[clamp(8px,1.5vmin,18px)] border-t-transparent border-b-transparent border-l-[#43AA8B]/40" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[clamp(8px,1.5vmin,18px)] border-r-[clamp(8px,1.5vmin,18px)] border-t-[clamp(8px,1.5vmin,18px)] border-l-transparent border-r-transparent border-t-[#F94144]/40" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[clamp(8px,1.5vmin,18px)] border-b-[clamp(8px,1.5vmin,18px)] border-r-[clamp(8px,1.5vmin,18px)] border-t-transparent border-b-transparent border-r-[#F9C74F]/40" />
          <div className="absolute inset-[25%] rounded-full bg-[#E8D3B0]/50 border border-[#D4C4A0]" />
        </div>
      </div>
    );
  }

  let customBg = "bg-white";
  let isHomeStretch = false;

  if (cIdx === 5 && rIdx >= 1 && rIdx <= 4) {
    customBg = "bg-[#43AA8B]/30";
    isHomeStretch = true;
  } else if (rIdx === 5 && cIdx >= 6 && cIdx <= 9) {
    customBg = "bg-[#277DA1]/30";
    isHomeStretch = true;
  } else if (rIdx === 5 && cIdx >= 1 && cIdx <= 4) {
    customBg = "bg-[#F9C74F]/30";
    isHomeStretch = true;
  } else if (cIdx === 5 && rIdx >= 6 && rIdx <= 9) {
    customBg = "bg-[#F94144]/30";
    isHomeStretch = true;
  }

  if (rIdx === 0 && cIdx === 4) customBg = "bg-[#43AA8B]";
  else if (rIdx === 4 && cIdx === 10) customBg = "bg-[#277DA1]";
  else if (rIdx === 6 && cIdx === 0) customBg = "bg-[#F9C74F]";
  else if (rIdx === 10 && cIdx === 6) customBg = "bg-[#F94144]";

  const arrowRotation = getArrowRotation({ r: rIdx, c: cIdx });

  const borderClass =
    customBg === "bg-white"
      ? "border-[#D4C4A0]/60 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
      : isHomeStretch
        ? "border-transparent"
        : "border-white/40 shadow-inner";

  return (
    <div
      key={`cell-${rIdx}-${cIdx}`}
      style={{
        gridRowStart: rIdx + 1,
        gridColumnStart: cIdx + 1,
      }}
      className={`${CELL_CLASS} ${borderClass} ${customBg}`}
    >
      {!isHomeStretch && !customBg.startsWith("bg-[") && customBg === "bg-white" ? (
        <svg
          className={`w-2/5 h-2/5 text-[#C4B89A]/60 ${arrowRotation}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : null}
    </div>
  );
}

const cells: React.ReactNode[] = [];
for (let rIdx = 0; rIdx < 11; rIdx++) {
  for (let cIdx = 0; cIdx < 11; cIdx++) {
    const cell = buildCell(rIdx, cIdx);
    if (cell) cells.push(cell);
  }
}

const BoardCellsInner: React.FC = () => (
  <>
    <div className="absolute inset-0 bg-white/30 rounded-xl pointer-events-none -z-10" />
    {cells}
  </>
);

export const BoardCells = React.memo(BoardCellsInner);
