// front/src/utils/boardCoordinates.ts

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

export const baseCoords: Record<number, GridCoord[]> = {
  0: [{ r: 1, c: 8 }, { r: 1, c: 9 }, { r: 2, c: 8 }, { r: 2, c: 9 }],   // قرمز (بالا-راست)
  1: [{ r: 8, c: 8 }, { r: 8, c: 9 }, { r: 9, c: 8 }, { r: 9, c: 9 }],   // آبی (پایین-راست)
  2: [{ r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 2 }],   // سبز (بالا-چپ)
  3: [{ r: 8, c: 1 }, { r: 8, c: 2 }, { r: 9, c: 1 }, { r: 9, c: 2 }]    // زرد (پایین-چپ)
};

export const homeCoords: Record<number, GridCoord[]> = {
  0: [{ r: 1, c: 5 }, { r: 2, c: 5 }, { r: 3, c: 5 }, { r: 4, c: 5 }],   // مسیر امن قرمز
  1: [{ r: 5, c: 9 }, { r: 5, c: 8 }, { r: 5, c: 7 }, { r: 5, c: 6 }],   // مسیر امن آبی
  2: [{ r: 5, c: 1 }, { r: 5, c: 2 }, { r: 5, c: 3 }, { r: 5, c: 4 }],   // مسیر امن سبز
  3: [{ r: 9, c: 5 }, { r: 8, c: 5 }, { r: 7, c: 5 }, { r: 6, c: 5 }]    // مسیر امن زرد
};

export const goalCoord: GridCoord = { r: 5, c: 5 };

// اضافه شدن آفست‌های شروع حرکت برای هر رنگ
const START_OFFSETS: Record<number, number> = {
  0: 0,   // قرمز از خانه 0 شروع میکنه
  1: 10,  // آبی از خانه 10
  3: 20,  // زرد از خانه 20
  2: 30   // سبز از خانه 30
};

export function getGridCoordinates(vIdx: number, pos: number, pieceIdx: number): GridCoord {
  if (pos === -1) {
    return baseCoords[vIdx]?.[pieceIdx] || { r: 0, c: 0 };
  }
  if (pos >= 0 && pos <= 39) {
    // اعمال آفست برای اینکه هر رنگ از جای درست خودش وارد زمین شود
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