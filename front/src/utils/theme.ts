/**
 * @file src/utils/theme.ts
 * @description Dynamic CSS Custom Properties injector for runtime theme changes.
 * Compatible with all ES standards (ES5+).
 */

import colors from './colors';

export type ThemeMode = 'light' | 'dark';

/**
 * Iterates through active theme properties and registers them as global CSS variables.
 * Uses Object.keys for backwards compatibility with older ECMAScript targets.
 * @param mode Target theme mode ('light' or 'dark')
 */
export function applyTheme(mode: ThemeMode): void {
  const themeColors = colors[mode];
  const root = document.documentElement;

  // Set the document data attribute or class name for safety
  root.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Cast keys as keyof themeColors to maintain strict TypeScript typing
  const keys = Object.keys(themeColors) as Array<keyof typeof themeColors>;
  
  keys.forEach((key) => {
    const value = themeColors[key];
    // Convert camelCase to kebab-case (e.g., textPrimary -> --text-primary)
    const cssKey = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

    if (Array.isArray(value)) {
      // Map gradient colors dynamically to indexed CSS variables
      value.forEach((colorVal, idx) => {
        root.style.setProperty(`${cssKey}-${idx}`, colorVal);
      });
    } else {
      root.style.setProperty(cssKey, value as string);
    }
  });
}