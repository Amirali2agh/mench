// front/src/utils/boardCoordinates4p.ts
// Self-contained geometry for the 4-player board.
// Seating is clockwise with no diagonal neighbours:
//   Red bottom-left (0), Blue bottom-right (1),
//   Green top-right (2), Yellow top-left (3).
// The backend player index maps 1:1 to the corner index (no swapping).

export interface GridCoord {
  r: number;
  c: number;
}

// 40-cell circular track (0-39), matching the %40 modulus used everywhere.
// Path goes clockwise around the 11x11 board.
export const circularTrack: GridCoord[] = [
  { r: 0, c: 6 }, { r: 1, c: 6 }, { r: 2, c: 6 }, { r: 3, c: 6 },
  { r: 4, c: 6 },
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
export const safeTrackPositions = new Set([0, 9, 14, 19, 24, 29, 34, 39]);

// Base yard piece positions:
// 0 = red (bottom-left), 1 = blue (bottom-right),
// 2 = green (top-right), 3 = yellow (top-left)
export const baseCoords: Record<number, GridCoord[]> = {
  0: [{ r: 8, c: 1 }, { r: 8, c: 2 }, { r: 9, c: 1 }, { r: 9, c: 2 }],   // قرمز (پایین-چپ)
  1: [{ r: 8, c: 8 }, { r: 8, c: 9 }, { r: 9, c: 8 }, { r: 9, c: 9 }],   // آبی (پایین-راست)
  2: [{ r: 1, c: 8 }, { r: 1, c: 9 }, { r: 2, c: 8 }, { r: 2, c: 9 }],   // سبز (بالا-راست)
  3: [{ r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 2 }]    // زرد (بالا-چپ)
};

// Home stretch coordinates (path from track into center).
// Each color enters home from the track cell right before its start offset.
export const homeCoords: Record<number, GridCoord[]> = {
  0: [{ r: 9, c: 5 }, { r: 8, c: 5 }, { r: 7, c: 5 }, { r: 6, c: 5 }],   // قرمز (عمودی از پایین)
  1: [{ r: 5, c: 9 }, { r: 5, c: 8 }, { r: 5, c: 7 }, { r: 5, c: 6 }],   // آبی (افقی از راست)
  2: [{ r: 1, c: 5 }, { r: 2, c: 5 }, { r: 3, c: 5 }, { r: 4, c: 5 }],   // سبز (عمودی از بالا)
  3: [{ r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, { r: 5, c: 4 }]    // زرد (افقی از چپ)
};

export const goalCoord: GridCoord = { r: 5, c: 5 };

// Starting offsets on the circular track for each corner:
//   Red  (0): (10,4) == circularTrack[20] <- offset 20
//   Blue (1): (6,10) == circularTrack[10] <- offset 10
//   Green(2): (0,6)  == circularTrack[0]  <- offset 0
//   Yellow(3): (4,0) == circularTrack[30] <- offset 30
const START_OFFSETS: Record<number, number> = {
  0: 20,  // قرمز
  1: 10,  // آبی
  2: 0,   // سبز
  3: 30   // زرد
};

export function getGridCoordinates(vIdx: number, pos: number, pieceIdx: number): GridCoord {
  if (pos === -1) {
    return baseCoords[vIdx]?.[pieceIdx] || { r: 0, c: 0 };
  }
  if (pos >= 0 && pos <= 39) {
    const offset = START_OFFSETS[vIdx] || 0;
    const absolutePos = (pos + offset) % circularTrack.length;
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
