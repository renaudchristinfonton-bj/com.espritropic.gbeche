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

export interface InAppReminder {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

interface AppState {
  // Session de verrouillage (mémoire uniquement — redemandée à chaque lancement)
  isUnlocked: boolean;
  // Feedback XP / combo
  xpFeedback: XpFeedback | null;
  // Menu d'action rapide du FAB
  quickAction: QuickAction;
  // Rappels / notifications in-app (file d'attente visible par NotificationHost)
  reminders: InAppReminder[];
  // Compteur de rafraîchissement global (forcer un reload si besoin)
  refreshTick: number;
  // Tutoriel guidé (superposition), relançable depuis les Réglages
  tutorialOpen: boolean;

  lock: () => void;
  unlock: () => void;
  showXpFeedback: (feedback: XpFeedback) => void;
  clearXpFeedback: () => void;
  setQuickAction: (action: QuickAction) => void;
  pushReminder: (reminder: InAppReminder) => void;
  dismissReminder: (id: string) => void;
  clearReminders: () => void;
  bumpRefresh: () => void;
  openTutorial: () => void;
  closeTutorial: () => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    isUnlocked: false,
    xpFeedback: null,
    quickAction: null,
    reminders: [],
    refreshTick: 0,
    tutorialOpen: false,

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

    pushReminder: (reminder) =>
      set((state) => {
        // Évite les doublons si le planificateur repasse deux fois.
        if (state.reminders.some((item) => item.id === reminder.id)) return;
        state.reminders.unshift(reminder);
        // On ne garde que les 20 derniers rappels en mémoire.
        state.reminders = state.reminders.slice(0, 20);
      }),

    dismissReminder: (id) =>
      set((state) => {
        state.reminders = state.reminders.filter((item) => item.id !== id);
      }),

    clearReminders: () =>
      set((state) => {
        state.reminders = [];
      }),

    bumpRefresh: () =>
      set((state) => {
        state.refreshTick += 1;
      }),

    openTutorial: () =>
      set((state) => {
        state.tutorialOpen = true;
      }),

    closeTutorial: () =>
      set((state) => {
        state.tutorialOpen = false;
      }),
  })),
);
