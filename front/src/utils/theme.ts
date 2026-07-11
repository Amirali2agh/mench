// front/src/utils/theme.ts

export type ThemeMode = 'light' | 'dark';

/**
 * سیستم تم پویا به طور کامل غیرفعال شده است.
 * بازی برای همیشه روی دارک‌مد (Dark Mode) و تم چوبی زیبا قفل خواهد بود.
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;

  // همواره مستندات HTML را روی دارک‌مد تنظیم می‌کنیم تا افکت‌های تیره فعال بمانند
  root.setAttribute('data-theme', 'dark');
  root.classList.add('dark');
  
  // کدهای قدیمی که باعث تبدیل متغیرها و کرش زمان اجرا می‌شدند به طور کامل پاک شدند.
}