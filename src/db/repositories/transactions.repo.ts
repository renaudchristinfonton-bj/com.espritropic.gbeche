/**
 * Repository — Transactions financières.
 * Convention : amount signé (+ revenu, − dépense).
 */

import type { SQLiteBindParams } from 'expo-sqlite';

import { all, first, newId, run } from '../client';
import type { ID, TransactionRow, TxType } from '../types';

export interface CreateTransactionInput {
  accountId: ID;
  type: TxType;
  amount: number; // montant absolu, toujours > 0
  category: string;
  label?: string;
  note?: string;
  timestamp?: Date;
  isRecurring?: boolean;
}

export async function createTransaction(input: CreateTransactionInput): Promise<ID> {
  if (!(input.amount > 0)) {
    throw new Error('Le montant doit être strictement positif.');
  }
  const id = newId();
  const now = Date.now();
  const signed = input.type === 'expense' ? -Math.abs(input.amount) : Math.abs(input.amount);

  await run(
    `INSERT INTO transactions
       (id, account_id, amount, type, category, label, note, is_recurring, timestamp, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.accountId,
      signed,
      input.type,
      input.category,
      input.label?.trim() ?? '',
      input.note?.trim() ?? '',
      input.isRecurring ? 1 : 0,
      input.timestamp ? input.timestamp.getTime() : now,
      now,
    ],
  );
  return id;
}

export interface TransactionFilter {
  accountId?: ID;
  category?: string;
  type?: TxType;
  from?: number;
  to?: number;
  limit?: number;
}

export async function listTransactions(filter: TransactionFilter = {}): Promise<
  (TransactionRow & { account_name: string; account_color: string })[]
> {
  const clauses: string[] = [];
  const params: SQLiteBindParams = [];

  if (filter.accountId) {
    clauses.push('t.account_id = ?');
    params.push(filter.accountId);
  }
  if (filter.category) {
    clauses.push('t.category = ?');
    params.push(filter.category);
  }
  if (filter.type) {
    clauses.push('t.type = ?');
    params.push(filter.type);
  }
  if (filter.from !== undefined) {
    clauses.push('t.timestamp >= ?');
    params.push(filter.from);
  }
  if (filter.to !== undefined) {
    clauses.push('t.timestamp <= ?');
    params.push(filter.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = filter.limit ? `LIMIT ${Math.trunc(filter.limit)}` : '';

  return all(
    `SELECT t.*, a.name AS account_name, a.color AS account_color
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     ${where}
     ORDER BY t.timestamp DESC, t.created_at DESC
     ${limit};`,
    params,
  );
}

export async function sumByType(
  from: number,
  to: number,
  type: TxType,
): Promise<number> {
  const row = await first<{ total: number | null }>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE type = ? AND timestamp BETWEEN ? AND ?;`,
    [type, from, to],
  );
  return Math.abs(row?.total ?? 0);
}

export interface CategoryBreakdown {
  category: string;
  total: number; // positif
  count: number;
}

export async function expenseBreakdown(from: number, to: number): Promise<CategoryBreakdown[]> {
  return all<CategoryBreakdown>(
    `SELECT category,
            COALESCE(SUM(ABS(amount)), 0) AS total,
            COUNT(*) AS count
     FROM transactions
     WHERE type = 'expense' AND timestamp BETWEEN ? AND ?
     GROUP BY category
     ORDER BY total DESC;`,
    [from, to],
  );
}

export async function deleteTransaction(id: ID): Promise<void> {
  await run('DELETE FROM transactions WHERE id = ?;', [id]);
}
