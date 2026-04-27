/**
 * GBECHE — ThemeContext
 * Fournit le thème dark/light à toute l'application.
 * La préférence est persistée via MMKV (hors-ligne).
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme }  from 'react-native';
import { MMKV }           from 'react-native-mmkv';
import { buildTheme, type Theme } from './index';

// ─── MMKV storage (offline, rapide) ─────────────────────
const storage = new MMKV({ id: 'gbeche-settings' });
const THEME_KEY = 'app_theme';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme:     Theme;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  toggleTheme:  () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:        buildTheme('dark'),
  themeMode:    'dark',
  setThemeMode: () => {},
  toggleTheme:  () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? 'dark';
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => (storage.getString(THEME_KEY) as ThemeMode) ?? 'dark'
  );

  const resolvedMode: 'dark' | 'light' =
    themeMode === 'system' ? systemScheme : themeMode;

  const theme = buildTheme(resolvedMode);

  const setThemeMode = (m: ThemeMode) => {
    storage.set(THEME_KEY, m);
    setThemeModeState(m);
  };

  const toggleTheme = () => {
    const next = resolvedMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
