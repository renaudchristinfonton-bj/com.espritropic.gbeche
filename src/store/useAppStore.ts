/**
 * GBECHE — Store global (zustand + immer).
 * Ne contient QUE de l'état transitoire UI/session. Les données métier
 * vivent dans SQLite et sont lues via useRepoQuery ; on ne les duplique pas.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface XpFeedback {
  xpGained: number;
  multiplier: number;
  combo: number;
  leveledUp: boolean;
}

export type QuickAction = 'battle' | 'adversary' | 'expense' | 'income' | null;

interface AppState {
  // Session de verrouillage (mémoire uniquement — redemandée à chaque lancement)
  isUnlocked: boolean;
  // Feedback XP / combo
  xpFeedback: XpFeedback | null;
  // Menu d'action rapide du FAB
  quickAction: QuickAction;
  // Compteur de rafraîchissement global (forcer un reload si besoin)
  refreshTick: number;

  lock: () => void;
  unlock: () => void;
  showXpFeedback: (feedback: XpFeedback) => void;
  clearXpFeedback: () => void;
  setQuickAction: (action: QuickAction) => void;
  bumpRefresh: () => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    isUnlocked: false,
    xpFeedback: null,
    quickAction: null,
    refreshTick: 0,

    lock: () =>
      set((state) => {
        state.isUnlocked = false;
      }),

    unlock: () =>
      set((state) => {
        state.isUnlocked = true;
      }),

    showXpFeedback: (feedback) =>
      set((state) => {
        state.xpFeedback = feedback;
      }),

    clearXpFeedback: () =>
      set((state) => {
        state.xpFeedback = null;
      }),

    setQuickAction: (action) =>
      set((state) => {
        state.quickAction = action;
      }),

    bumpRefresh: () =>
      set((state) => {
        state.refreshTick += 1;
      }),
  })),
);
