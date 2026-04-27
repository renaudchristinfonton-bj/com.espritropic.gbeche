/**
 * GBECHE — Store Zustand (état global de l'application)
 * ────────────────────────────────────────────────────────
 * Centralize auth, gamification, UI state.
 * Persisted via MMKV pour survie hors-ligne complète.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── Types ────────────────────────────────────────────────
export type WarriorRank =
  | 'Recrue' | 'Fantassin' | 'Guerrier' | 'Vétéran'
  | 'Guerrier Élite' | 'Général' | 'Légende';

export interface WarriorProfile {
  name:    string;
  xp:      number;
  xpNext:  number;
  level:   number;
  rank:    WarriorRank;
  streak:  number;
  shields: number;           // streak shields (earned, not bought)
  wins:    number;
  losses:  number;
  medals:  string[];
  combo:   number;           // consecutive task completions
  lastActive: string | null; // ISO date
}

export interface DailyMission {
  id:       string;
  title:    string;
  icon:     string;
  current:  number;
  total:    number;
  xpReward: number;
  color:    string;
  done:     boolean;
}

export interface Achievement {
  id:          string;
  title:       string;
  description: string;
  icon:        string;
  xpReward:    number;
  unlockedAt:  string | null;
}

export interface AppState {
  // Auth
  isAuthenticated: boolean;
  isFirstLaunch:   boolean;
  pinHash:         string | null;

  // Warrior
  warrior: WarriorProfile;

  // Daily missions
  dailyMissions: DailyMission[];

  // UI
  activeTab:            'home' | 'wars' | 'calendar' | 'finance' | 'agent';
  pendingAchievement:   Achievement | null;
  showXpModal:          boolean;
  lastXpGained:         number;
  lastComboMultiplier:  number;

  // Actions — Auth
  setAuthenticated:  (v: boolean) => void;
  setFirstLaunch:    (v: boolean) => void;
  setPinHash:        (h: string) => void;

  // Actions — Gamification
  addXP:             (amount: number) => void;
  incrementStreak:   () => void;
  resetCombo:        () => void;
  unlockAchievement: (ach: Achievement) => void;
  clearAchievement:  () => void;
  closeXpModal:      () => void;
  completeTask:      (xp: number) => void;

  // Actions — UI
  setActiveTab:      (tab: AppState['activeTab']) => void;
  completeMission:   (id: string) => void;
}

// ─── XP thresholds per level ─────────────────────────────
const XP_TABLE = [0,100,250,500,850,1400,2100,3000,4200,5800,7800,10200,13200,17000,22000,28000];

function getRankForLevel(level: number): WarriorRank {
  if (level >= 14) return 'Légende';
  if (level >= 11) return 'Général';
  if (level >= 8)  return 'Guerrier Élite';
  if (level >= 6)  return 'Vétéran';
  if (level >= 4)  return 'Guerrier';
  if (level >= 2)  return 'Fantassin';
  return 'Recrue';
}

// ─── Default State ────────────────────────────────────────
const DEFAULT_WARRIOR: WarriorProfile = {
  name:       'Guerrier',
  xp:         3420,
  xpNext:     4200,
  level:      12,
  rank:       'Guerrier Élite',
  streak:     12,
  shields:    2,
  wins:       47,
  losses:     6,
  medals:     ['first_win', 'streak_7', 'finance_master'],
  combo:      0,
  lastActive: new Date().toISOString(),
};

const DEFAULT_MISSIONS: DailyMission[] = [
  { id:'m1', title:'Vaincre 3 Adversaires', icon:'⚔️', current:1, total:3, xpReward:200, color:'#FF6B35', done:false },
  { id:'m2', title:'Saisir une dépense',    icon:'💰', current:0, total:1, xpReward:100, color:'#FFD700', done:false },
  { id:'m3', title:'Maintenir le Streak',   icon:'🔥', current:1, total:1, xpReward:150, color:'#FF4757', done:true  },
];

// ─── Store ────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    // ── Initial State ──────────────────────────────────
    isAuthenticated: false,
    isFirstLaunch:   true,
    pinHash:         null,

    warrior:       DEFAULT_WARRIOR,
    dailyMissions: DEFAULT_MISSIONS,

    activeTab:           'home',
    pendingAchievement:  null,
    showXpModal:         false,
    lastXpGained:        0,
    lastComboMultiplier: 1,

    // ── Auth Actions ───────────────────────────────────
    setAuthenticated: (v) => set(s => { s.isAuthenticated = v; }),
    setFirstLaunch:   (v) => set(s => { s.isFirstLaunch = v; }),
    setPinHash:       (h) => set(s => { s.pinHash = h; }),

    // ── Gamification ───────────────────────────────────
    addXP: (amount) => set(s => {
      const { warrior } = s;
      warrior.xp += amount;

      // Level up?
      while (warrior.level < XP_TABLE.length - 1 && warrior.xp >= XP_TABLE[warrior.level]) {
        warrior.level++;
        warrior.xpNext = XP_TABLE[warrior.level] || warrior.xpNext + 5000;
        warrior.rank = getRankForLevel(warrior.level);
      }
    }),

    completeTask: (xp) => set(s => {
      const { warrior } = s;
      warrior.combo += 1;
      warrior.wins  += 1;

      // Combo multiplier
      let mult = 1;
      if (warrior.combo >= 5) mult = 2.0;
      else if (warrior.combo >= 3) mult = 1.5;
      else if (warrior.combo >= 2) mult = 1.2;

      const finalXP = Math.round(xp * mult);
      warrior.xp   += finalXP;

      // Level up
      while (warrior.level < XP_TABLE.length - 1 && warrior.xp >= XP_TABLE[warrior.level]) {
        warrior.level++;
        warrior.xpNext = XP_TABLE[warrior.level] || warrior.xpNext + 5000;
        warrior.rank = getRankForLevel(warrior.level);
      }

      s.lastXpGained        = finalXP;
      s.lastComboMultiplier = mult;
      s.showXpModal         = true;

      // Mission m1 progress
      const m = s.dailyMissions.find(m => m.id === 'm1');
      if (m && !m.done) {
        m.current = Math.min(m.current + 1, m.total);
        if (m.current >= m.total) m.done = true;
      }
    }),

    closeXpModal: () => set(s => { s.showXpModal = false; }),
    resetCombo:   () => set(s => { s.warrior.combo = 0; }),

    incrementStreak: () => set(s => {
      s.warrior.streak += 1;
      s.warrior.lastActive = new Date().toISOString();
    }),

    unlockAchievement: (ach) => set(s => {
      s.pendingAchievement = ach;
    }),

    clearAchievement: () => set(s => { s.pendingAchievement = null; }),

    // ── UI ─────────────────────────────────────────────
    setActiveTab: (tab) => set(s => { s.activeTab = tab; }),

    completeMission: (id) => set(s => {
      const m = s.dailyMissions.find(m => m.id === id);
      if (m && !m.done) { m.done = true; m.current = m.total; }
    }),
  }))
);