import React, { createContext, useContext, useState, useEffect } from 'react';
import WaterSplitOverlay from '../components/WaterSplitOverlay';

type Theme = 'light' | 'dark';

export interface ThemeClickCoords {
  x: number;
  y: number;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent | ThemeClickCoords | null) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sahaayaa_theme') as Theme;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [transitionState, setTransitionState] = useState<{
    active: boolean;
    coords: ThemeClickCoords | null;
    targetDark: boolean;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sahaayaa_theme', theme);
  }, [theme]);

  const toggleTheme = (e?: React.MouseEvent | ThemeClickCoords | null) => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';

    if (isReduced) {
      setTheme(nextTheme);
      return;
    }

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (e && 'clientX' in e && typeof e.clientX === 'number') {
      x = e.clientX;
      y = e.clientY;
    } else if (e && 'x' in e && typeof e.x === 'number') {
      x = e.x;
      y = e.y;
    }

    // Trigger water split animation overlay
    setTransitionState({
      active: true,
      coords: { x, y },
      targetDark: nextTheme === 'dark',
    });

    // Flip theme at midpoint of water split wave (~320ms)
    setTimeout(() => {
      setTheme(nextTheme);
    }, 320);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
      {transitionState?.active && (
        <WaterSplitOverlay
          isDarkTarget={transitionState.targetDark}
          clickCoords={transitionState.coords}
          onComplete={() => setTransitionState(null)}
        />
      )}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
