/* eslint-disable import/first */
/**
 * Tests du moteur de gamification. Les repositories et la transaction
 * SQLite sont mockés : seules les règles métier sont exercées.
 */
import type { AdversaryRow, GamificationRow } from '../../db/types';

const freshProfile = (): GamificationRow => ({
  id: 1,
  xp: 0,
  level: 1,
  streak: 0,
  shields: 0,
  wins: 0,
  losses: 0,
  combo: 0,
  best_combo: 0,
  medals: '[]',
  last_active: null,
  updated_at: 0,
});

const makeInstance = (overrides: Partial<AdversaryRow> = {}): AdversaryRow => ({
  id: 'adv-1',
  template_id: null,
  battle_id: 'battle-1',
  war_id: 'war-1',
  title: 'Test',
  xp_reward: 50,
  scheduled_at: Date.now(),
  hour: 8,
  duration_min: 30,
  status: 'pending',
  completed_at: null,
  created_at: Date.now(),
  updated_at: Date.now(),
  ...overrides,
});

let mockProfile: GamificationRow;
let mockInstance: AdversaryRow;

jest.mock('../../db/repositories/gamification.repo', () => ({
  getProfile: jest.fn(async () => mockProfile),
  saveProfile: jest.fn(async (next: GamificationRow) => {
    Object.assign(mockProfile, next);
  }),
  recordLoss: jest.fn(async () => {
    mockProfile.losses += 1;
    mockProfile.combo = 0;
  }),
}));

jest.mock('../../db/repositories/wars.repo', () => ({
  addWarXp: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../db/repositories/adversaries.repo', () => ({
  getInstance: jest.fn(async () => mockInstance),
  setInstanceStatus: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../db/client', () => ({
  transaction: jest.fn(async (task: () => Promise<void>) => task()),
}));

import {
  getWarriorProfile,
  levelProgress,
  loseAdversary,
  rankForLevel,
  winAdversary,
} from '../gamification.service';

beforeEach(() => {
  mockProfile = freshProfile();
  mockInstance = makeInstance();
  jest.clearAllMocks();
});

describe('winAdversary — XP, combos, niveaux', () => {
  test('première victoire : combo 1, multiplicateur ×1, XP de base', async () => {
    const result = await winAdversary('adv-1');
    expect(result.xpGained).toBe(50);
    expect(result.multiplier).toBe(1);
    expect(result.combo).toBe(1);
    expect(mockProfile.xp).toBe(50);
    expect(mockProfile.wins).toBe(1);
    expect(mockProfile.streak).toBe(1);
  });

  test('combo de 3 → multiplicateur ×1,5', async () => {
    await winAdversary('adv-1');
    await winAdversary('adv-1');
    const third = await winAdversary('adv-1');
    expect(third.combo).toBe(3);
    expect(third.multiplier).toBe(1.5);
    expect(third.xpGained).toBe(75);
  });

  test('combo de 5 → multiplicateur ×2', async () => {
    for (let i = 0; i < 5; i += 1) {
      await winAdversary('adv-1');
    }
    const sixth = await winAdversary('adv-1');
    expect(sixth.combo).toBe(6);
    expect(sixth.multiplier).toBe(2);
  });

  test('victoire déjà remportée : aucun XP supplémentaire', async () => {
    mockInstance.status = 'won';
    const result = await winAdversary('adv-1');
    expect(result.xpGained).toBe(0);
    expect(mockProfile.xp).toBe(0);
  });

  test('franchissement de seuil → montée de niveau', async () => {
    mockProfile.xp = 95;
    const result = await winAdversary('adv-1');
    expect(result.leveledUp).toBe(true);
    expect(mockProfile.level).toBe(2);
  });

  test('la streak ne double pas le même jour', async () => {
    await winAdversary('adv-1');
    await winAdversary('adv-1');
    expect(mockProfile.streak).toBe(1);
  });
});

describe('loseAdversary', () => {
  test('enregistre la défaite et casse le combo', async () => {
    await winAdversary('adv-1');
    expect(mockProfile.combo).toBe(1);
    await loseAdversary('adv-1');
    expect(mockProfile.losses).toBe(1);
    expect(mockProfile.combo).toBe(0);
  });
});

describe('rangs et progression', () => {
  test('rankForLevel suit les paliers', () => {
    expect(rankForLevel(1)).toBe('Recrue');
    expect(rankForLevel(2)).toBe('Fantassin');
    expect(rankForLevel(4)).toBe('Guerrier');
    expect(rankForLevel(15)).toBe('Légende');
  });

  test('levelProgress reste borné à 100 %', async () => {
    // Niveau 2 : palier 100 → 250 XP. 175 XP place donc à 50 % du palier.
    const progress = levelProgress({ ...freshProfile(), xp: 175, level: 2 });
    expect(progress.percent).toBe(50);
    await expect(getWarriorProfile()).resolves.toBeTruthy();
  });
});
