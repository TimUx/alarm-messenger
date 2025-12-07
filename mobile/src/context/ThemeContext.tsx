import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { storageService } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    inactive: string;
  };
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#f5f5f5',
    surface: '#ffffff',
    primary: '#dc3545',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#dddddd',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    inactive: '#6c757d',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#1a1a1a',
    surface: '#2a2a2a',
    primary: '#dc3545',
    text: '#ffffff',
    textSecondary: '#999999',
    border: '#444444',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    inactive: '#6c757d',
  },
};

const hexToRgba = (hex: string, alpha: number): string => {
  // Validate hex format
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    console.warn('Invalid hex color format:', hex);
    return `rgba(0, 0, 0, ${alpha})`;
  }
  
  // Expand shorthand hex (#abc -> #aabbcc)
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getThemeColors = (theme: Theme) => ({
  ...theme.colors,
  primaryLight: hexToRgba(theme.colors.primary, 0.12),
  overlayBackground: hexToRgba(theme.dark ? '#000000' : '#000000', 0.5),
});

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedMode = await storageService.getThemeMode();
      if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await storageService.saveThemeMode(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const getEffectiveTheme = (): Theme => {
    if (themeMode === 'auto') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getEffectiveTheme();

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
