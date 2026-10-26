/* eslint-disable import/first */
/**
 * Tests du repository de conversation (client SQLite mocké).
 */
interface CapturedCall {
  sql: string;
  params: unknown[];
}

const mockCalls: CapturedCall[] = [];

jest.mock('../../client', () => ({
  all: jest.fn(async () => [{ id: 'm1', role: 'agent', text: 'salut', intents_json: '[]', created_at: 1 }]),
  run: jest.fn(async (sql: string, params: unknown[] = []) => {
    mockCalls.push({ sql, params });
    return { lastInsertRowId: 1, changes: 1 };
  }),
  newId: jest.fn(() => 'new-id'),
}));

import { addMessage, clearChat, countMessages, listMessages } from '../chat.repo';

beforeEach(() => {
  mockCalls.length = 0;
});

describe('addMessage', () => {
  test('sérialise les intentions en JSON et persiste le rôle', async () => {
    await addMessage('user', 'mon solde', ['balance']);
    const insert = mockCalls.find((c) => c.sql.includes('INSERT INTO chat_messages'));
    expect(insert).toBeDefined();
    expect(insert!.params).toContain('user');
    expect(insert!.params).toContain('mon solde');
    expect(insert!.params).toContain(JSON.stringify(['balance']));
  });
});

describe('listMessages / countMessages / clearChat', () => {
  test('liste triée par date avec limite', async () => {
    const rows = await listMessages(50);
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe('salut');
  });

  test('countMessages lit le COUNT', async () => {
    const { all } = jest.requireMock('../../client');
    all.mockResolvedValueOnce([{ n: 7 }]);
    await expect(countMessages()).resolves.toBe(7);
  });

  test('clearChat émet un DELETE', async () => {
    await clearChat();
    expect(mockCalls.some((c) => c.sql === 'DELETE FROM chat_messages;')).toBe(true);
  });
});
