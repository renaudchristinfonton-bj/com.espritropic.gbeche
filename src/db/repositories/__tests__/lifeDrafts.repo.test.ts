/* eslint-disable import/first */
/**
 * Tests du repository de brouillons de projets de vie.
 * Le client SQLite est mocké : on vérifie le SQL émis et la
 * désérialisation des slots, sans base réelle.
 */
interface CapturedCall {
  sql: string;
  params: unknown[];
}

const mockCalls: CapturedCall[] = [];
let mockRows: unknown[] = [];

jest.mock('../../client', () => ({
  all: jest.fn(async () => mockRows),
  run: jest.fn(async (sql: string, params: unknown[] = []) => {
    mockCalls.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
}));

import { clearDraft, getActiveDraft, upsertDraft } from '../lifeDrafts.repo';
import type { LifeDraft } from '../../../services/agent/lifeProject.service';

beforeEach(() => {
  mockCalls.length = 0;
  mockRows = [];
});

describe('getActiveDraft', () => {
  test('renvoie null quand aucune ligne n existe', async () => {
    await expect(getActiveDraft()).resolves.toBeNull();
  });

  test('reconstruit le brouillon depuis la ligne SQLite', async () => {
    mockRows = [
      {
        id: 'active',
        guide_id: 'vehicle',
        step_index: 2,
        slots_json: JSON.stringify({ vision: 'Citadine', target: '3 000 000 FCFA' }),
        status: 'collecting',
      },
    ];
    const draft = await getActiveDraft();
    expect(draft).toEqual({
      guideId: 'vehicle',
      stepIndex: 2,
      slots: { vision: 'Citadine', target: '3 000 000 FCFA' },
      status: 'collecting',
    });
  });

  test('un JSON corrompu retombe sur des slots vides sans planter', async () => {
    mockRows = [
      { id: 'active', guide_id: 'faith', step_index: 1, slots_json: '{casque', status: 'collecting' },
    ];
    const draft = await getActiveDraft();
    expect(draft?.slots).toEqual({});
    expect(draft?.guideId).toBe('faith');
  });
});

describe('upsertDraft', () => {
  test('sérialise les slots et utilise l id fixe active', async () => {
    const draft: LifeDraft = {
      guideId: 'marriage',
      stepIndex: 1,
      slots: { vision: 'Un foyer', horizon: '1 an' },
      status: 'collecting',
    };
    await upsertDraft(draft);
    const insert = mockCalls.find((c) => c.sql.includes('INSERT INTO life_project_drafts'));
    expect(insert).toBeDefined();
    expect(insert!.params).toContain('active');
    expect(insert!.params).toContain('marriage');
    expect(insert!.params).toContain(JSON.stringify(draft.slots));
    // L'upsert doit gérer la mise à jour (brouillon unique).
    expect(insert!.sql).toMatch(/ON CONFLICT\(id\) DO UPDATE/);
  });
});

describe('clearDraft', () => {
  test('purge uniquement le brouillon actif', async () => {
    await clearDraft();
    const del = mockCalls.find((c) => c.sql.startsWith('DELETE FROM life_project_drafts'));
    expect(del).toBeDefined();
    expect(del!.params).toEqual(['active']);
  });
});
