// src/store/index.ts
// Gestion d'état avec Zustand

import { create } from 'zustand';

interface AppState {
  isAuthenticated: boolean;
  isFirstTime: boolean;
  currentUser: any;
  theme: 'dark' | 'light';

  setAuthenticated: (value: boolean) => void;
  setFirstTime: (value: boolean) => void;
  setCurrentUser: (user: any) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  isFirstTime: true,
  currentUser: null,
  theme: 'dark',

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setFirstTime: (value) => set({ isFirstTime: value }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setTheme: (theme) => set({ theme }),
}));