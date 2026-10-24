/**
 * GBECHE — Moteur de gamification.
 * XP, niveaux, rangs, combos multiplicateurs, streaks quotidiens.
 * Toutes les règles sont déterministes et persistées dans SQLite.
 */

import {
  getProfile,
  recordLoss,
  saveProfile,
} from '../db/repositories/gamification.repo';
import { addWarXp } from '../db/repositories/wars.repo';
import { getInstance, setInstanceStatus } from '../db/repositories/adversaries.repo';
import { transaction } from '../db/client';
import type { GamificationRow, ID } from '../db/types';
import { daysBetween, todayKey } from './format';

// ─── Parcours de niveaux ──────────────────────────────────
const XP_THRESHOLDS = [
  0, 100, 250, 500, 850, 1400, 2100, 3000, 4200, 5800, 7800, 10200, 13200,
  17000, 22000, 28000, 36000,
];

export type WarriorRank =
  | 'Recrue'
  | 'Fantassin'
  | 'Guerrier'
  | 'Vétéran'
  | 'Guerrier Élite'
  | 'Général'
  | 'Légende';

export function rankForLevel(level: number): WarriorRank {
  if (level >= 15) return 'Légende';
  if (level >= 12) return 'Général';
  if (level >= 9) return 'Guerrier Élite';
  if (level >= 7) return 'Vétéran';
  if (level >= 4) return 'Guerrier';
  if (level >= 2) return 'Fantassin';
  return 'Recrue';
}

export function levelProgress(profile: GamificationRow): {
  current: number;
  needed: number;
  percent: number;
} {
  const levelIndex = Math.min(profile.level - 1, XP_THRESHOLDS.length - 2);
  const floor = XP_THRESHOLDS[levelIndex];
  const ceiling = XP_THRESHOLDS[levelIndex + 1] ?? floor + 8000;
  const current = profile.xp - floor;
  const needed = ceiling - floor;
  return { current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) };
}

function applyLevelUps(profile: GamificationRow): boolean {
  let leveledUp = false;
  while (
    profile.level < XP_THRESHOLDS.length &&
    profile.xp >= XP_THRESHOLDS[profile.level]
  ) {
    profile.level += 1;
    leveledUp = true;
  }
  return leveledUp;
}

function comboMultiplier(combo: number): number {
  if (combo >= 5) return 2;
  if (combo >= 3) return 1.5;
  if (combo >= 2) return 1.2;
  return 1;
}

function applyStreak(profile: GamificationRow): void {
  const today = todayKey();
  if (profile.last_active === today) return;
  if (!profile.last_active) {
    profile.streak = 1;
  } else {
    const gap = daysBetween(profile.last_active, today);
    profile.streak = gap === 1 ? profile.streak + 1 : 1;
  }
  profile.last_active = today;
}

// ─── Actions ──────────────────────────────────────────────
export interface WinResult {
  xpGained: number;
  multiplier: number;
  combo: number;
  leveledUp: boolean;
  profile: GamificationRow;
}

export async function winAdversary(adversaryId: ID): Promise<WinResult> {
  const instance = await getInstance(adversaryId);
  if (!instance) throw new Error('Adversaire introuvable.');
  if (instance.status === 'won') {
    return {
      xpGained: 0,
      multiplier: 1,
      combo: 0,
      leveledUp: false,
      profile: await getProfile(),
    };
  }

  const profile = await getProfile();
  profile.combo += 1;
  profile.wins += 1;
  profile.best_combo = Math.max(profile.best_combo, profile.combo);

  const multiplier = comboMultiplier(profile.combo);
  const xpGained = Math.round(instance.xp_reward * multiplier);
  profile.xp += xpGained;

  applyStreak(profile);
  const leveledUp = applyLevelUps(profile);

  await transaction(async () => {
    await setInstanceStatus(instance.id, 'won');
    await saveProfile(profile);
    await addWarXp(instance.war_id, xpGained);
  });

  return { xpGained, multiplier, combo: profile.combo, leveledUp, profile };
}

export async function loseAdversary(adversaryId: ID): Promise<void> {
  await transaction(async () => {
    await setInstanceStatus(adversaryId, 'lost');
    await recordLoss();
  });
}

export async function getWarriorProfile(): Promise<GamificationRow> {
  return getProfile();
}

export { rankForLevel as getRankForLevel };
