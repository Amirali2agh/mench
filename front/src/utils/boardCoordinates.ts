// front/src/utils/boardCoordinates.ts
// Updated to match reference layout: TL=yellow, TR=blue, BL=red, BR=green

export interface GridCoord {
  r: number;
  c: number;
}

// 40-cell circular track (0-39), matching the %40 modulus used everywhere.
// Path goes clockwise around the 11x11 board.
// Added missing cell (4,6) so that each player's colored start cell
// aligns with offsets 0, 10, 20, 30 — consistent with the backend.
export const circularTrack: GridCoord[] = [
  { r: 0, c: 6 },
  { r: 1, c: 6 },
  { r: 2, c: 6 },
  { r: 3, c: 6 },
  { r: 4, c: 6 } /* ← added missing cell — connects (3,6)→(4,7) */,
  { r: 4, c: 7 },
  { r: 4, c: 8 },
  { r: 4, c: 9 },
  { r: 4, c: 10 },
  { r: 5, c: 10 },
  { r: 6, c: 10 },
  { r: 6, c: 9 },
  { r: 6, c: 8 },
  { r: 6, c: 7 },
  { r: 6, c: 6 },
  { r: 7, c: 6 },
  { r: 8, c: 6 },
  { r: 9, c: 6 },
  { r: 10, c: 6 },
  { r: 10, c: 5 },
  { r: 10, c: 4 },
  { r: 9, c: 4 },
  { r: 8, c: 4 },
  { r: 7, c: 4 },
  { r: 6, c: 4 },
  { r: 6, c: 3 },
  { r: 6, c: 2 },
  { r: 6, c: 1 },
  { r: 6, c: 0 },
  { r: 5, c: 0 },
  { r: 4, c: 0 },
  { r: 4, c: 1 },
  { r: 4, c: 2 },
  { r: 4, c: 3 },
  { r: 4, c: 4 },
  { r: 3, c: 4 },
  { r: 2, c: 4 },
  { r: 1, c: 4 },
  { r: 0, c: 4 },
  { r: 0, c: 5 },
];

// Safe cells (star positions) on the circular track
// Shifted by +1 from indices >=4 to account for the inserted cell.
export const safeTrackPositions = new Set([0, 9, 14, 19, 24, 29, 34, 39]);

// Base yard piece positions for the reference layout:
// TL=yellow(v3), TR=blue(v1), BL=red(v0), BR=green(v2)
export const baseCoords: Record<number, GridCoord[]> = {
  0: [
    { r: 8, c: 1 },
    { r: 8, c: 2 },
    { r: 9, c: 1 },
    { r: 9, c: 2 },
  ], // قرمز (پایین-چپ)
  1: [
    { r: 1, c: 8 },
    { r: 1, c: 9 },
    { r: 2, c: 8 },
    { r: 2, c: 9 },
  ], // آبی (بالا-راست)
  2: [
    { r: 8, c: 8 },
    { r: 8, c: 9 },
    { r: 9, c: 8 },
    { r: 9, c: 9 },
  ], // سبز (پایین-راست)
  3: [
    { r: 1, c: 1 },
    { r: 1, c: 2 },
    { r: 2, c: 1 },
    { r: 2, c: 2 },
  ], // زرد (بالا-چپ)
};

// Home stretch coordinates (path from track into center)
export const homeCoords: Record<number, GridCoord[]> = {
  0: [
    { r: 9, c: 5 },
    { r: 8, c: 5 },
    { r: 7, c: 5 },
    { r: 6, c: 5 },
  ], // قرمز (عمودی از پایین)
  1: [
    { r: 1, c: 5 },
    { r: 2, c: 5 },
    { r: 3, c: 5 },
    { r: 4, c: 5 },
  ], // آبی (عمودی از بالا)
  2: [
    { r: 5, c: 9 },
    { r: 5, c: 8 },
    { r: 5, c: 7 },
    { r: 5, c: 6 },
  ], // سبز (افقی از راست)
  3: [
    { r: 5, c: 1 },
    { r: 5, c: 2 },
    { r: 5, c: 3 },
    { r: 5, c: 4 },
  ], // زرد (افقی از چپ)
};

export const goalCoord: GridCoord = { r: 5, c: 5 };

// Starting offsets on the circular track for each visual corner.
// Each color's start cell is at its matching offset in the 40-cell track:
//   Red    (vIdx=0): (10,4) ≡ circularTrack[20] ← offset 20
//   Blue   (vIdx=1): (0,6)  ≡ circularTrack[0]  ← offset 0
//   Green  (vIdx=2): (4,0)  ≡ circularTrack[30] ← offset 30
//   Yellow (vIdx=3): (6,10) ≡ circularTrack[10] ← offset 10
const START_OFFSETS: Record<number, number> = {
  0: 20, // قرمز
  1: 0, // آبی
  2: 30, // سبز
  3: 10, // زرد
};

export function getGridCoordinates(
  vIdx: number,
  pos: number,
  pieceIdx: number,
): GridCoord {
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
  if (c === 6 && r >= 0 && r <= 3) return "rotate-90";
  if (r === 4 && c >= 6 && c <= 10) return "rotate-0";
  if (r === 5 && c === 10) return "rotate-90";
  if (r === 6 && c >= 6 && c <= 10) return "rotate-180";
  if (c === 6 && r >= 7 && r <= 10) return "rotate-90";
  if (r === 10 && c === 5) return "rotate-180";
  if (c === 4 && r >= 6 && r <= 10) return "rotate-270";
  if (r === 6 && c >= 0 && c <= 3) return "rotate-180";
  if (r === 5 && c === 0) return "rotate-270";
  if (r === 4 && c >= 0 && c <= 4) return "rotate-0";
  if (c === 4 && r >= 0 && r <= 3) return "rotate-270";
  if (r === 0 && c === 5) return "rotate-0";
  return "";
}

// Which player color index owns each star position for coloring the star
// Shifted by +1 from indices >=4 to account for the inserted cell.
export const starColorMap: Record<number, string> = {
  0: "text-blue-500",
  9: "text-green-500",
  14: "text-green-500",
  19: "text-red-500",
  24: "text-red-500",
  29: "text-yellow-500",
  34: "text-yellow-500",
  39: "text-blue-500",
};
