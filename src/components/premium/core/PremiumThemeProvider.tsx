'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PremiumTheme {
  // Trading-specific colors
  colors: {
    profit: string;
    loss: string;
    neutral: string;
    bid: string;
    ask: string;
    spread: string;
    volume: string;
    // Chart colors
    candleUp: string;
    candleDown: string;
    chartGrid: string;
    chartBackground: string;
    // UI colors
    panelBackground: string;
    panelBorder: string;
    headerBackground: string;
    sidebarBackground: string;
  };
  // Typography
  fonts: {
    mono: string;
    sans: string;
    serif: string;
  };
  // Spacing and sizing
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  // Animation
  animations: {
    fast: string;
    normal: string;
    slow: string;
  };
  // Breakpoints
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    ultrawide: string;
  };
}

const defaultTheme: PremiumTheme = {
  colors: {
    profit: '#10b981', // green-500
    loss: '#ef4444',   // red-500
    neutral: '#6b7280', // gray-500
    bid: '#3b82f6',    // blue-500
    ask: '#f59e0b',    // amber-500
    spread: '#8b5cf6', // purple-500
    volume: '#06b6d4', // cyan-500
    candleUp: '#10b981',
    candleDown: '#ef4444',
    chartGrid: '#374151',
    chartBackground: '#111827',
    panelBackground: '#1f2937',
    panelBorder: '#374151',
    headerBackground: '#111827',
    sidebarBackground: '#0f172a',
  },
  fonts: {
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  animations: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    ultrawide: '1536px',
  },
};

interface PremiumThemeContextType {
  theme: PremiumTheme;
  updateTheme: (updates: Partial<PremiumTheme>) => void;
  resetTheme: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const PremiumThemeContext = createContext<PremiumThemeContextType | undefined>(undefined);

interface PremiumThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Partial<PremiumTheme>;
}

export function PremiumThemeProvider({ children, initialTheme }: PremiumThemeProviderProps) {
  const [theme, setTheme] = useState<PremiumTheme>({
    ...defaultTheme,
    ...initialTheme,
  });
  const [isDarkMode, setIsDarkMode] = useState(true); // Trading platforms prefer dark mode

  const updateTheme = (updates: Partial<PremiumTheme>) => {
    setTheme(prev => ({
      ...prev,
      ...updates,
      colors: { ...prev.colors, ...updates.colors },
      fonts: { ...prev.fonts, ...updates.fonts },
      spacing: { ...prev.spacing, ...updates.spacing },
      animations: { ...prev.animations, ...updates.animations },
      breakpoints: { ...prev.breakpoints, ...updates.breakpoints },
    }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Apply CSS custom properties
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Apply theme colors as CSS custom properties
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--premium-color-${key}`, value);
      });

      // Apply fonts
      Object.entries(theme.fonts).forEach(([key, value]) => {
        root.style.setProperty(`--premium-font-${key}`, value);
      });

      // Apply spacing
      Object.entries(theme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--premium-spacing-${key}`, value);
      });

      // Apply animations
      Object.entries(theme.animations).forEach(([key, value]) => {
        root.style.setProperty(`--premium-animation-${key}`, value);
      });

      // Apply dark mode class
      if (isDarkMode) {
        root.classList.add('premium-dark');
        root.classList.remove('premium-light');
      } else {
        root.classList.add('premium-light');
        root.classList.remove('premium-dark');
      }
    }
  }, [theme, isDarkMode]);

  const value: PremiumThemeContextType = {
    theme,
    updateTheme,
    resetTheme,
    isDarkMode,
    toggleDarkMode,
  };

  return (
    <PremiumThemeContext.Provider value={value}>
      {children}
    </PremiumThemeContext.Provider>
  );
}

export function usePremiumTheme() {
  const context = useContext(PremiumThemeContext);
  if (context === undefined) {
    throw new Error('usePremiumTheme must be used within a PremiumThemeProvider');
  }
  return context;
}

// Theme utility functions
export const themeUtils = {
  // Get color with opacity
  withOpacity: (color: string, opacity: number) => {
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  },
  
  // Get contrasting text color
  getContrastColor: (backgroundColor: string) => {
    // Simple contrast calculation - can be enhanced
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  },
  
  // Darken/lighten color
  adjustColor: (color: string, amount: number) => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  },
};

// CSS-in-JS helper for theme-aware styles
export function createThemeStyles(theme: PremiumTheme) {
  return {
    // Common trading UI styles
    panel: {
      backgroundColor: theme.colors.panelBackground,
      border: `1px solid ${theme.colors.panelBorder}`,
      borderRadius: '8px',
      padding: theme.spacing.md,
    },
    
    profitText: {
      color: theme.colors.profit,
      fontFamily: theme.fonts.mono,
      fontWeight: '600',
    },
    
    lossText: {
      color: theme.colors.loss,
      fontFamily: theme.fonts.mono,
      fontWeight: '600',
    },
    
    neutralText: {
      color: theme.colors.neutral,
      fontFamily: theme.fonts.mono,
    },
    
    headerBar: {
      backgroundColor: theme.colors.headerBackground,
      borderBottom: `1px solid ${theme.colors.panelBorder}`,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    },
    
    sidebar: {
      backgroundColor: theme.colors.sidebarBackground,
      borderRight: `1px solid ${theme.colors.panelBorder}`,
      width: '240px',
    },
    
    chart: {
      backgroundColor: theme.colors.chartBackground,
      gridColor: theme.colors.chartGrid,
    },
  };
}