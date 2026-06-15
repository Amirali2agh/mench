import { useEffect, useState } from 'react';
import { applyTheme, ThemeMode } from './utils/theme';

export function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark'); // Default to dark mode

  // Automatically apply the selected theme on mount and change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Optional: Toggle handler to switch colors on demand
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    // Your game layout components
    <div>
      {/* Example of toggle button */}
      <button onClick={toggleTheme} className="fixed top-4 right-4 p-2 bg-secondary text-secondaryContent rounded-lg">
        Toggle Theme
      </button>
    </div>
  );
}