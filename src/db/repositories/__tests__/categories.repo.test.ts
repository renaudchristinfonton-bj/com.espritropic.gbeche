/* eslint-disable import/first */
/**
 * Tests du repository des catégories personnalisées. Le client SQLite
 * est mocké : on capture le SQL et on pilote les réponses de `first`.
 */
interface CapturedCall {
  sql: string;
  params: unknown[];
}

const mockCalls: CapturedCall[] = [];
let mockFirstResults: unknown[] = [];

jest.mock('../../client', () => ({
  all: jest.fn(async () => []),
  first: jest.fn(async () => mockFirstResults.shift() ?? null),
  run: jest.fn(async (sql: string, params: unknown[] = []) => {
    mockCalls.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
  newId: jest.fn(() => 'cat-new'),
}));

import {
  categoryInUse,
  createCategory,
  deleteCategory,
  listCategories,
} from '../categories.repo';

beforeEach(() => {
  mockCalls.length = 0;
  mockFirstResults = [];
});

describe('createCategory', () => {
  test('refuse un nom vide', async () => {
    await expect(
      createCategory({ label: '   ', icon: 'pricetag', color: '#fff', kind: 'expense' }),
    ).rejects.toThrow(/obligatoire/);
  });

  test('refuse un doublon (même nom, même type)', async () => {
    mockFirstResults = [{ n: 1 }];
    await expect(
      createCategory({ label: 'Transport pro', icon: 'car', color: '#00E5FF', kind: 'expense' }),
    ).rejects.toThrow(/existe déjà/);
  });

  test('insère avec un id généré et le kind demandé', async () => {
    mockFirstResults = [{ n: 0 }];
    const id = await createCategory({
      label: 'Dîmes',
      icon: 'gift',
      color: '#FFD700',
      kind: 'income',
    });

    expect(id).toBe('cat-new');
    const insert = mockCalls.find((call) => call.sql.includes('INSERT INTO categories'));
    expect(insert).toBeDefined();
    expect(insert!.params).toContain('Dîmes');
    expect(insert!.params).toContain('income');
  });
});

describe('listCategories', () => {
  test('filtre par kind quand le paramètre est fourni', async () => {
    const { all } = jest.requireMock('../../client');
    await listCategories('expense');
    expect(all).toHaveBeenCalledWith(expect.stringContaining('WHERE kind = ?'), ['expense']);
  });
});

describe('deleteCategory', () => {
  test('refuse la suppression si des transactions utilisent la catégorie', async () => {
    mockFirstResults = [{ n: 2 }];
    await expect(deleteCategory('cat-1')).rejects.toThrow(/utilisée/);
    expect(mockCalls.some((call) => call.sql.includes('DELETE'))).toBe(false);
  });

  test('supprime quand ni transaction ni budget ne référencent la catégorie', async () => {
    mockFirstResults = [{ n: 0 }, { n: 0 }];
    await categoryInUse('cat-1');
    await deleteCategory('cat-1');

    const del = mockCalls.find((call) => call.sql.includes('DELETE FROM categories'));
    expect(del).toBeDefined();
    expect(del!.params).toEqual(['cat-1']);
  });
});
