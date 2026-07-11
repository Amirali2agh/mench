// front/src/utils/colors.ts

export interface ColorTheme {
  primary: string;
  bg: string;
  piece: string;
  pieceBorder: string;
  accent: string;
  homeStrip: string;
}

export const playerColors: Record<number, ColorTheme> = {
  0: {
    primary: 'text-red-600 bg-red-600',
    bg: 'bg-red-500',
    piece: 'bg-red-600',
    pieceBorder: 'border-red-800',
    accent: 'bg-red-100',
    homeStrip: 'bg-red-600/20'
  },
  1: {
    primary: 'text-blue-600 bg-blue-600',
    bg: 'bg-blue-500',
    piece: 'bg-blue-600',
    pieceBorder: 'border-blue-800',
    accent: 'bg-blue-100',
    homeStrip: 'bg-blue-600/20'
  },
  2: {
    primary: 'text-green-600 bg-green-600',
    bg: 'bg-green-500',
    piece: 'bg-green-600',
    pieceBorder: 'border-green-800',
    accent: 'bg-green-100',
    homeStrip: 'bg-green-600/20'
  },
  3: {
    primary: 'text-yellow-500 bg-yellow-500',
    bg: 'bg-yellow-400',
    piece: 'bg-yellow-500',
    pieceBorder: 'border-yellow-700',
    accent: 'bg-yellow-100',
    homeStrip: 'bg-yellow-500/20'
  }
};

// خروجی پیش‌فرض برای حل مشکل ایمپورت در theme.ts
export default playerColors;