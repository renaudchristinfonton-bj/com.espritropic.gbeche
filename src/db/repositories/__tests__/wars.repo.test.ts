/* eslint-disable import/first */
/**
 * Tests du repository des guerres. Le client SQLite est mocké : on
 * capture les écritures SQL et on simule la réponse MAX(sort_order).
 */
interface CapturedCall {
  sql: string;
  params: unknown[];
}

const mockCalls: CapturedCall[] = [];
let mockMaxOrder: number | null = null;

jest.mock('../../client', () => ({
  all: jest.fn(async () => []),
  first: jest.fn(async () => (mockMaxOrder === null ? null : { max: mockMaxOrder })),
  run: jest.fn(async (sql: string, params: unknown[] = []) => {
    mockCalls.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
  transaction: jest.fn(async (task: () => Promise<void>) => task()),
  newId: jest.fn(() => 'new-id'),
}));

import { createWar, deleteWar, setWarActive } from '../wars.repo';

beforeEach(() => {
  mockCalls.length = 0;
  mockMaxOrder = null;
});

describe('createWar', () => {
  test('insère une guerre active avec un sort_order dérivé du MAX existant', async () => {
    mockMaxOrder = 2;
    const id = await createWar({
      title: 'Projet immobilier',
      icon: 'home',
      color: '#00E5FF',
      domainType: 'custom',
    });

    expect(id).toBe('new-id');
    const insert = mockCalls.find((call) => call.sql.includes('INSERT INTO wars'));
    expect(insert).toBeDefined();
    expect(insert!.sql).toContain('is_active');
    const params = insert!.params;
    // Ordre des params : id, title, icon, color, domain_type, sort_order,
    // created_at, updated_at (is_active et xp_earned sont des littéraux SQL).
    expect(params[1]).toBe('Projet immobilier'); // titre trimmé
    expect(params[4]).toBe('custom'); // domain_type
    expect(params[5]).toBe(3); // MAX(2) + 1
  });

  test('première guerre : sort_order à 0 quand la table est vide', async () => {
    await createWar({
      title: 'Finance',
      icon: 'wallet',
      color: '#FFD700',
      domainType: 'finance',
    });
    const insert = mockCalls.find((call) => call.sql.includes('INSERT INTO wars'));
    expect(insert!.params[5]).toBe(0);
  });
});

describe('setWarActive', () => {
  test('bascule le flag et rafraîchit updated_at', async () => {
    await setWarActive('war-9', false);
    const update = mockCalls.find((call) => call.sql.includes('UPDATE wars SET is_active'));
    expect(update!.params[0]).toBe(0);
    expect(update!.params[2]).toBe('war-9');
  });
});

describe('deleteWar', () => {
  test('passe par une transaction', async () => {
    const { transaction } = jest.requireMock('../../client');
    await deleteWar('war-9');
    expect(transaction).toHaveBeenCalled();
    expect(mockCalls.some((call) => call.sql.includes('DELETE FROM wars'))).toBe(true);
  });
});
