// front/src/utils/boardCoordinates.ts
// Updated to match reference layout: TL=green, TR=blue, BL=red, BR=yellow

export interface GridCoord {
  r: number;
  c: number;
}

export const circularTrack: GridCoord[] = [
  { r: 0, c: 6 }, { r: 1, c: 6 }, { r: 2, c: 6 }, { r: 3, c: 6 },
  { r: 4, c: 7 }, { r: 4, c: 8 }, { r: 4, c: 9 }, { r: 4, c: 10 },
  { r: 5, c: 10 },
  { r: 6, c: 10 }, { r: 6, c: 9 }, { r: 6, c: 8 }, { r: 6, c: 7 }, { r: 6, c: 6 },
  { r: 7, c: 6 }, { r: 8, c: 6 }, { r: 9, c: 6 }, { r: 10, c: 6 },
  { r: 10, c: 5 },
  { r: 10, c: 4 }, { r: 9, c: 4 }, { r: 8, c: 4 }, { r: 7, c: 4 }, { r: 6, c: 4 },
  { r: 6, c: 3 }, { r: 6, c: 2 }, { r: 6, c: 1 }, { r: 6, c: 0 },
  { r: 5, c: 0 },
  { r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 },
  { r: 3, c: 4 }, { r: 2, c: 4 }, { r: 1, c: 4 }, { r: 0, c: 4 },
  { r: 0, c: 5 }
];

// Safe cells (star positions) on the circular track
export const safeTrackPositions = new Set([0, 8, 13, 18, 23, 28, 33, 38]);

// Base yard piece positions for the reference layout:
// TL=green(v2), TR=blue(v1), BL=red(v0), BR=yellow(v3)
export const baseCoords: Record<number, GridCoord[]> = {
  0: [{ r: 8, c: 1 }, { r: 8, c: 2 }, { r: 9, c: 1 }, { r: 9, c: 2 }],   // قرمز (پایین-چپ)
  1: [{ r: 1, c: 8 }, { r: 1, c: 9 }, { r: 2, c: 8 }, { r: 2, c: 9 }],   // آبی (بالا-راست)
  2: [{ r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 2 }],   // سبز (بالا-چپ)
  3: [{ r: 8, c: 8 }, { r: 8, c: 9 }, { r: 9, c: 8 }, { r: 9, c: 9 }]    // زرد (پایین-راست)
};

// Home stretch coordinates (path from track into center)
export const homeCoords: Record<number, GridCoord[]> = {
  0: [{ r: 9, c: 5 }, { r: 8, c: 5 }, { r: 7, c: 5 }, { r: 6, c: 5 }],   // قرمز (عمودی از پایین)
  1: [{ r: 1, c: 5 }, { r: 2, c: 5 }, { r: 3, c: 5 }, { r: 4, c: 5 }],   // آبی (عمودی از بالا)
  2: [{ r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, { r: 5, c: 4 }],   // سبز (افقی از چپ)
  3: [{ r: 5, c: 9 }, { r: 5, c: 8 }, { r: 5, c: 7 }, { r: 5, c: 6 }]    // زرد (افقی از راست)
};

export const goalCoord: GridCoord = { r: 5, c: 5 };

// Starting offsets on the circular track for each player
const START_OFFSETS: Record<number, number> = {
  0: 20,  // قرمز (پایین-چپ) از خانه ۲۰ شروع می‌کند
  1: 0,   // آبی (بالا-راست) از خانه ۰
  2: 30,  // سبز (بالا-چپ) از خانه ۳۰
  3: 10   // زرد (پایین-راست) از خانه ۱۰
};

export function getGridCoordinates(vIdx: number, pos: number, pieceIdx: number): GridCoord {
  if (pos === -1) {
    return baseCoords[vIdx]?.[pieceIdx] || { r: 0, c: 0 };
  }
  if (pos >= 0 && pos <= 39) {
    const offset = START_OFFSETS[vIdx] || 0;
    const absolutePos = (pos + offset) % 40;
    return circularTrack[absolutePos];
  }
  if (pos >= 40 && pos <= 43) {
    const homeIndex = pos - 40;
    return homeCoords[vIdx]?.[homeIndex] || goalCoord;
  }
  return goalCoord;
}

export function getArrowRotation(coord: GridCoord): string {
  const { r, c } = coord;
  if (c === 6 && r >= 0 && r <= 3) return 'rotate-90';
  if (r === 4 && c >= 6 && c <= 10) return 'rotate-0';
  if (r === 5 && c === 10) return 'rotate-90';
  if (r === 6 && c >= 6 && c <= 10) return 'rotate-180';
  if (c === 6 && r >= 7 && r <= 10) return 'rotate-90';
  if (r === 10 && c === 5) return 'rotate-180';
  if (c === 4 && r >= 6 && r <= 10) return 'rotate-270';
  if (r === 6 && c >= 0 && c <= 3) return 'rotate-180';
  if (r === 5 && c === 0) return 'rotate-270';
  if (r === 4 && c >= 0 && c <= 4) return 'rotate-0';
  if (c === 4 && r >= 0 && r <= 3) return 'rotate-270';
  if (r === 0 && c === 5) return 'rotate-0';
  return '';
}

// Which player color index owns each star position for coloring the star
export const starColorMap: Record<number, string> = {
  0: 'text-blue-500',
  8: 'text-yellow-500',
  13: 'text-yellow-500',
  18: 'text-red-500',
  23: 'text-red-500',
  28: 'text-green-500',
  33: 'text-green-500',
  38: 'text-blue-500',
};
