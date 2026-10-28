import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      title={`Switch to ${dark ? 'light' : 'dark'} theme`}
      className="relative inline-flex h-9 w-16 items-center rounded-full border border-line bg-surface-2 p-1 transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <Sun className="absolute left-2 h-3.5 w-3.5 text-subtle" />
      <Moon className="absolute right-2 h-3.5 w-3.5 text-subtle" />
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow-card transition-transform duration-300 ease-out ${
          dark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {dark ? <Moon className="h-3.5 w-3.5 text-accent" /> : <Sun className="h-3.5 w-3.5 text-warn" />}
      </span>
    </button>
  );
};
