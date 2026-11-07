/**
 * GBECHE — ThemeContext.
 * Préférence persistée dans la table settings (cache synchro chargé au boot).
 * Le mode sombre reste la référence ; le mode clair est maintenu en parallèle.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { getSetting, setSetting, SETTING_KEYS } from '../db/settings';
import { buildTheme, type Theme } from './index';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: buildTheme('dark'),
  themeMode: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

function readStoredMode(): ThemeMode {
  const value = getSetting(SETTING_KEYS.themeMode);
  if (value === 'dark' || value === 'light' || value === 'system') return value;
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setMode] = useState<ThemeMode>(readStoredMode);
  const systemScheme = useColorScheme();

  const resolvedMode: 'dark' | 'light' =
    themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setMode(mode);
    void setSetting(SETTING_KEYS.themeMode, mode);
  };

  const toggleTheme = () => {
    setThemeMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
