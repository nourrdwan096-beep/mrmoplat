'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'mr_radwan_theme') {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('mr_radwan_theme') as Theme | null;
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}

function getServerSnapshot(): Theme {
  return 'dark';
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mr_radwan_theme', next);
    emitChange();
  };

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('mr_radwan_theme', newTheme);
    emitChange();
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mounted: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


