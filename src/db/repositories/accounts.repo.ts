/**
 * Repository — Comptes financiers.
 * Les soldes ne sont jamais stockés : ils résultent de initial_balance + Σ transactions.
 */

import { all, first, newId, run } from '../client';
import type { AccountRow, AccountType, ID } from '../types';

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  initialBalance?: number;
  isDefault?: boolean;
}

export async function listAccounts(includeArchived = false): Promise<AccountRow[]> {
  const sql = includeArchived
    ? 'SELECT * FROM accounts ORDER BY is_default DESC, created_at ASC;'
    : 'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY is_default DESC, created_at ASC;';
  return all<AccountRow>(sql);
}

export async function getAccount(id: ID): Promise<AccountRow | null> {
  return first<AccountRow>('SELECT * FROM accounts WHERE id = ?;', [id]);
}

export async function countAccounts(): Promise<number> {
  const row = await first<{ n: number }>('SELECT COUNT(*) AS n FROM accounts;');
  return row?.n ?? 0;
}

export async function createAccount(input: CreateAccountInput): Promise<ID> {
  const id = newId();
  const now = Date.now();
  await run(
    `INSERT INTO accounts
       (id, name, type, icon, color, initial_balance, currency, is_default, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'XOF', ?, 0, ?, ?);`,
    [
      id,
      input.name.trim(),
      input.type,
      input.icon,
      input.color,
      input.initialBalance ?? 0,
      input.isDefault ? 1 : 0,
      now,
      now,
    ],
  );
  return id;
}

export async function archiveAccount(id: ID): Promise<void> {
  await run('UPDATE accounts SET is_archived = 1, is_default = 0, updated_at = ? WHERE id = ?;', [
    Date.now(),
    id,
  ]);
}

export interface AccountWithBalance extends AccountRow {
  balance: number;
}

export async function listAccountsWithBalance(): Promise<AccountWithBalance[]> {
  return all<AccountWithBalance>(
    `SELECT a.*,
            a.initial_balance + COALESCE((
              SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id
            ), 0) AS balance
     FROM accounts a
     WHERE a.is_archived = 0
     ORDER BY a.is_default DESC, a.created_at ASC;`,
  );
}

export async function getTotalBalance(): Promise<number> {
  const row = await first<{ total: number | null }>(
    `SELECT COALESCE(SUM(balance), 0) AS total FROM (
       SELECT a.initial_balance + COALESCE((
         SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id
       ), 0) AS balance
       FROM accounts a WHERE a.is_archived = 0
     );`,
  );
  return row?.total ?? 0;
}
