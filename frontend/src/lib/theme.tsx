import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
});

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem('theme');
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // _document already applied the class before paint; just sync state with it
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    // Enable colour transitions only after the first paint
    requestAnimationFrame(() => document.documentElement.classList.add('theme-ready'));

    // Follow the OS setting until the user picks a theme themselves
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!storedTheme()) apply(systemTheme());
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const apply = (next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  const toggle = useCallback(() => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode: the choice just won't persist
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
