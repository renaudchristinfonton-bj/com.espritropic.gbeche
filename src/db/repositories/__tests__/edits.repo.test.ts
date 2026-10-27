/* eslint-disable import/first */
/**
 * Tests des fonctions de modification / suppression ajoutées aux
 * repositories. Le client SQLite est entièrement mocké : on vérifie le
 * SQL dynamique généré et ses paramètres.
 */
interface CapturedCall {
  sql: string;
  params: unknown[];
}

const mockCalls: CapturedCall[] = [];
let mockFirstResponder: ((sql: string) => unknown) | null = null;

jest.mock('../../client', () => ({
  all: jest.fn(async () => []),
  first: jest.fn(async (sql: string) =>
    mockFirstResponder ? mockFirstResponder(sql) : null,
  ),
  run: jest.fn(async (sql: string, params: unknown[] = []) => {
    mockCalls.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
  transaction: jest.fn(async (task: () => Promise<void>) => task()),
  getDb: jest.fn(() => ({ runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })) })),
  newId: jest.fn(() => 'new-id'),
}));

import { updateWar } from '../wars.repo';
import { updateBattle, deleteBattle } from '../battles.repo';
import {
  updateManualInstance,
  updateTemplate,
  deleteInstance,
} from '../adversaries.repo';
import { updateTransaction } from '../transactions.repo';
import type { AdversaryRow, AdversaryTemplateRow } from '../../types';

beforeEach(() => {
  mockCalls.length = 0;
  mockFirstResponder = null;
});

describe('updateWar', () => {
  test('ne génère aucun SQL sans champ fourni', async () => {
    await updateWar('w1', {});
    expect(mockCalls).toHaveLength(0);
  });

  test('construit un UPDATE dynamique avec les seuls champs transmis', async () => {
    await updateWar('w1', { title: '  Nouvelle guerre  ', color: '#00E5FF' });
    const call = mockCalls.find((item) => item.sql.includes('UPDATE wars'));
    expect(call).toBeDefined();
    expect(call!.sql).toContain('title = ?');
    expect(call!.sql).toContain('color = ?');
    expect(call!.sql).not.toContain('icon = ?');
    expect(call!.params).toEqual(['Nouvelle guerre', '#00E5FF', expect.any(Number), 'w1']);
  });
});

describe('updateBattle', () => {
  test('persiste la date déchéance en epoch et gère une échéance nulle', async () => {
    const deadline = new Date(2026, 11, 31);
    await updateBattle('b1', { title: 'Objectif Q4', priority: 'high', deadline });
    const call = mockCalls.find((item) => item.sql.includes('UPDATE battles'));
    expect(call!.params).toContain(deadline.getTime());
    expect(call!.params).toContain('high');

    mockCalls.length = 0;
    await updateBattle('b1', { deadline: null });
    const cleared = mockCalls.find((item) => item.sql.includes('UPDATE battles'));
    expect(cleared!.params).toContain(null);
  });
});

describe('deleteBattle', () => {
  test('émet un DELETE simple (la cascade FK fait le reste)', async () => {
    await deleteBattle('b1');
    expect(mockCalls.some((c) => c.sql === 'DELETE FROM battles WHERE id = ?;')).toBe(true);
  });
});

describe('updateTemplate', () => {
  const template: AdversaryTemplateRow = {
    id: 'tpl-1',
    battle_id: 'b1',
    war_id: 'w1',
    title: 'Sport',
    xp_reward: 50,
    frequency: 'daily',
    specific_days: '[]',
    hour: 7,
    minute: 0,
    interval_days: 0,
    duration_min: 30,
    start_date: Date.now() - 86_400_000,
    end_date: null,
    is_active: 1,
    created_at: Date.now(),
  };

  test('met à jour la routine et termine sans erreur (aucune instance future)', async () => {
    mockFirstResponder = (sql: string) =>
      sql.includes('adversary_templates') ? { ...template } : null;

    await expect(
      updateTemplate('tpl-1', { title: 'Sport 45 min', hour: 6 }),
    ).resolves.toBeUndefined();

    const update = mockCalls.find((call) =>
      call.sql.includes('UPDATE adversary_templates'),
    );
    expect(update).toBeDefined();
    expect(update!.params).toContain('Sport 45 min');
    expect(update!.params).toContain(6);
  });

  test('refuse un titre vide', async () => {
    mockFirstResponder = () => ({ ...template });
    await expect(updateTemplate('tpl-1', { title: '   ' })).rejects.toThrow();
  });
});

describe('updateManualInstance', () => {
  const manual: AdversaryRow = {
    id: 'adv-1',
    template_id: null,
    battle_id: 'b1',
    war_id: 'w1',
    title: 'Appeler client',
    xp_reward: 50,
    scheduled_at: Date.now() + 3_600_000,
    hour: 18,
    minute: 0,
    duration_min: 30,
    status: 'pending',
    completed_at: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  test('refuse la modification directe dune occurrence de routine', async () => {
    mockFirstResponder = () => ({ ...manual, template_id: 'tpl-1' });
    await expect(
      updateManualInstance('adv-1', { title: 'Autre' }),
    ).rejects.toThrow(/routine/);
  });

  test('décale lheure et la date via scheduledAt', async () => {
    mockFirstResponder = () => ({ ...manual });
    const when = new Date();
    when.setDate(when.getDate() + 2);
    when.setHours(9, 0, 0, 0);

    await updateManualInstance('adv-1', { scheduledAt: when, title: 'Rappel' });
    const call = mockCalls.find((item) => item.sql.includes('UPDATE adversaries'));
    expect(call!.params).toContain(when.getTime());
    expect(call!.params).toContain(9);
    expect(call!.params).toContain('Rappel');
  });
});

describe('deleteInstance', () => {
  test('refuse de supprimer une occurrence issue dune routine', async () => {
    mockFirstResponder = () => ({ template_id: 'tpl-1' });
    await expect(deleteInstance('adv-1')).rejects.toThrow(/routine/);
  });

  test('supprime une mission ponctuelle', async () => {
    mockFirstResponder = () => ({ template_id: null });
    await deleteInstance('adv-1');
    expect(
      mockCalls.some((c) => c.sql === 'DELETE FROM adversaries WHERE id = ?;'),
    ).toBe(true);
  });
});

describe('updateTransaction', () => {
  test('refuse un montant nul ou négatif', async () => {
    await expect(updateTransaction('t1', { amount: 0 })).rejects.toThrow(/positif/);
  });

  test('re-signe le montant selon le type', async () => {
    await updateTransaction('t1', { amount: 5000, type: 'expense' });
    const expense = mockCalls.find((call) => call.sql.includes('UPDATE transactions'));
    expect(expense!.params).toContain(-5000);

    mockCalls.length = 0;
    await updateTransaction('t1', { amount: 5000, type: 'income' });
    const income = mockCalls.find((call) => call.sql.includes('UPDATE transactions'));
    expect(income!.params).toContain(5000);
  });
});
