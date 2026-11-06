/* eslint-disable import/first */
/**
 * Rappel « guerre qui décroche » : au plus une fois par jour, jamais sur une
 * guerre déjà planifiée aujourd'hui, et silence complet en cas d'erreur.
 */
jest.mock('@/src/db/settings', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    SETTING_KEYS: {
      focusNudgeEnabled: 'focus_nudge_enabled',
      focusNudgeDate: 'focus_nudge_date',
    },
    getSettingBool: (key: string, fallback = false) => {
      const value = store.get(key);
      return value === undefined ? fallback : value === '1';
    },
    getSetting: (key: string) => store.get(key),
    setSetting: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
});
jest.mock('@/src/db/repositories/adversaries.repo', () => ({
  listInstancesForDay: jest.fn(async () => []),
  listInstancesInRange: jest.fn(async () => []),
}));
jest.mock('@/src/db/repositories/wars.repo', () => ({
  listWars: jest.fn(async () => []),
}));

import * as settings from '@/src/db/settings';
import { listInstancesForDay, listInstancesInRange } from '@/src/db/repositories/adversaries.repo';
import { listWars } from '@/src/db/repositories/wars.repo';
import {
  FOCUS_NUDGE_DAYS,
  alreadyNudgedToday,
  maybeNudgeFragileWar,
  resetFocusNudgeMemory,
} from '../focusNudge.service';
import type { AdversaryRow, WarRow } from '@/src/db/types';

const store = (settings as unknown as { __store: Map<string, string> }).__store;
const mockedWars = listWars as jest.MockedFunction<typeof listWars>;
const mockedRange = listInstancesInRange as jest.MockedFunction<typeof listInstancesInRange>;
const mockedDay = listInstancesForDay as jest.MockedFunction<typeof listInstancesForDay>;

const NOW = new Date(2026, 10, 6, 12).getTime();
const DAY = 86_400_000;

const sportWar: WarRow = {
  id: 'w-sport',
  title: 'Santé',
  icon: 'flame',
  color: '#00E5FF',
  domain_type: 'health',
  xp_earned: 0,
  is_active: 1,
  sort_order: 0,
  created_at: NOW,
  updated_at: NOW,
};
const moneyWar: WarRow = { ...sportWar, id: 'w-money', title: 'Argent', domain_type: 'finance' };

let seq = 0;
function instance(warId: string, status: AdversaryRow['status'], msAgo: number): AdversaryRow {
  seq += 1;
  return {
    id: `i-${seq}`,
    template_id: null,
    battle_id: `b-${warId}`,
    war_id: warId,
    title: 'mission',
    xp_reward: 10,
    scheduled_at: NOW - msAgo,
    hour: 7,
    minute: 0,
    duration_min: 10,
    status,
    completed_at: status === 'won' ? NOW - msAgo : null,
    created_at: NOW - msAgo,
    updated_at: NOW - msAgo,
  };
}

beforeEach(() => {
  store.clear();
  resetFocusNudgeMemory();
  jest.clearAllMocks();
  mockedWars.mockResolvedValue([sportWar, moneyWar]);
  mockedRange.mockResolvedValue([]);
  mockedDay.mockResolvedValue([]);
});

describe('alreadyNudgedToday', () => {
  it('compare des jours locaux', () => {
    expect(alreadyNudgedToday(NOW, '2026-11-06')).toBe(true);
    expect(alreadyNudgedToday(NOW, '2026-11-05')).toBe(false);
    expect(alreadyNudgedToday(NOW, undefined)).toBe(false);
    expect(alreadyNudgedToday(NOW, '')).toBe(false);
  });
});

describe('maybeNudgeFragileWar', () => {
  it('ne fait rien quand le réglage est désactivé', async () => {
    store.set('focus_nudge_enabled', '0');
    mockedRange.mockResolvedValue([
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(false);
    expect(sink).not.toHaveBeenCalled();
  });

  it('ne fait rien si le rappel a déjà été émis aujourd’hui', async () => {
    store.set('focus_nudge_date', '2026-11-06');
    mockedRange.mockResolvedValue([
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(false);
    expect(sink).not.toHaveBeenCalled();
  });

  it('émet un rappel pour la guerre qui décroche', async () => {
    mockedRange.mockResolvedValue([
      instance('w-sport', 'won', DAY),
      instance('w-sport', 'won', 2 * DAY),
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(true);
    expect(sink).toHaveBeenCalledTimes(1);
    const reminder = sink.mock.calls[0][0];
    expect(reminder.title).toContain('Argent');
    expect(reminder.body).toContain(`${FOCUS_NUDGE_DAYS} jours`);
    expect(reminder.route).toBe('/(app)/wars');
    expect(store.get('focus_nudge_date')).toBe('2026-11-06');
  });

  it('ne relance pas une guerre déjà pourvue aujourd’hui', async () => {
    mockedRange.mockResolvedValue([
      instance('w-sport', 'won', DAY),
      instance('w-sport', 'won', 2 * DAY),
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    mockedDay.mockResolvedValue([instance('w-money', 'pending', -3600_000)]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(false);
    expect(sink).not.toHaveBeenCalled();
    // La date n'est pas verrouillée : le rappel reste possible demain.
    expect(store.get('focus_nudge_date')).toBeUndefined();
  });

  it('ne fait rien quand toutes les guerres tiennent', async () => {
    mockedRange.mockResolvedValue([
      instance('w-sport', 'won', DAY),
      instance('w-sport', 'won', 2 * DAY),
      instance('w-money', 'won', DAY),
      instance('w-money', 'won', 2 * DAY),
    ]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(false);
  });

  it('ne fait rien sans aucune guerre', async () => {
    mockedWars.mockResolvedValue([]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(false);
  });

  it('ne relit pas la base une deuxième fois le même jour', async () => {
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(false);
    expect(mockedRange).toHaveBeenCalledTimes(1);
    // Même jour, une heure plus tard : aucune nouvelle requête.
    expect(await maybeNudgeFragileWar(sink, NOW + 3600_000)).toBe(false);
    expect(mockedRange).toHaveBeenCalledTimes(1);
  });

  it('réévalue au changement de jour', async () => {
    const sink = jest.fn();
    await maybeNudgeFragileWar(sink, NOW);
    mockedRange.mockResolvedValue([
      instance('w-sport', 'won', DAY),
      instance('w-sport', 'won', 2 * DAY),
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    expect(await maybeNudgeFragileWar(sink, NOW + DAY)).toBe(true);
    expect(mockedRange).toHaveBeenCalledTimes(2);
  });

  it('échoue en silence si la base ne répond pas', async () => {
    mockedWars.mockRejectedValue(new Error('db fermée'));
    const sink = jest.fn();
    await expect(maybeNudgeFragileWar(sink, NOW)).resolves.toBe(false);
    expect(sink).not.toHaveBeenCalled();
  });

  it('n’émet qu’un seul rappel par jour, même appelé deux fois', async () => {
    mockedRange.mockResolvedValue([
      instance('w-sport', 'won', DAY),
      instance('w-sport', 'won', 2 * DAY),
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(true);
    expect(await maybeNudgeFragileWar(sink, NOW + 3600_000)).toBe(false);
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('réapparaît le lendemain', async () => {
    mockedRange.mockResolvedValue([
      instance('w-sport', 'won', DAY),
      instance('w-sport', 'won', 2 * DAY),
      instance('w-money', 'lost', DAY),
      instance('w-money', 'lost', 2 * DAY),
    ]);
    const sink = jest.fn();
    expect(await maybeNudgeFragileWar(sink, NOW)).toBe(true);
    expect(await maybeNudgeFragileWar(sink, NOW + DAY)).toBe(true);
    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink.mock.calls[1][0].id).not.toBe(sink.mock.calls[0][0].id);
  });
});
