import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppStore, Theme } from '../store';

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-smoke/20 dark:hover:bg-smoke/20 light:hover:bg-gray-200/50 transition-all cursor-pointer group"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light Mode (⌘T)' : 'Dark Mode (⌘T)'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-ash/70 group-hover:text-amber-400 transition-colors" strokeWidth={1.5} />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 group-hover:text-indigo-500 transition-colors" strokeWidth={1.5} />
      )}
      <kbd className="p-1 bg-smoke/30 dark:bg-smoke/30 rounded text-[10px] font-mono text-ash/60 dark:text-ash/60 border border-smoke/40 dark:border-smoke/40 leading-none aspect-square flex items-center justify-center">⌘T</kbd>
    </button>
  );
}

