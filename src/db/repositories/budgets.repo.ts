/**
 * Repository — Budgets mensuels par catégorie.
 */

import { all, first, newId, run } from '../client';
import type { BudgetRow, ID } from '../types';

export async function listBudgetsForMonth(month: string): Promise<BudgetRow[]> {
  return all<BudgetRow>(
    'SELECT * FROM budgets WHERE month = ? ORDER BY amount DESC;',
    [month],
  );
}

export async function upsertBudget(
  category: string,
  amount: number,
  month: string,
): Promise<ID> {
  if (!(amount > 0)) throw new Error('Le budget doit être positif.');
  const existing = await first<BudgetRow>(
    'SELECT * FROM budgets WHERE category = ? AND month = ?;',
    [category, month],
  );

  if (existing) {
    await run('UPDATE budgets SET amount = ? WHERE id = ?;', [amount, existing.id]);
    return existing.id;
  }

  const id = newId();
  await run(
    `INSERT INTO budgets (id, category, amount, period, month, created_at)
     VALUES (?, ?, ?, 'monthly', ?, ?);`,
    [id, category, amount, month, Date.now()],
  );
  return id;
}

export async function deleteBudget(id: ID): Promise<void> {
  await run('DELETE FROM budgets WHERE id = ?;', [id]);
}

export interface BudgetWithSpent extends BudgetRow {
  spent: number;
}

export async function budgetsWithSpent(month: string): Promise<BudgetWithSpent[]> {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1).getTime();
  const end = new Date(year, monthIndex, 1, 0, 0, 0, -1).getTime();

  return all<BudgetWithSpent>(
    `SELECT b.*,
            COALESCE((
              SELECT SUM(ABS(t.amount))
              FROM transactions t
              WHERE t.category = b.category
                AND t.type = 'expense'
                AND t.timestamp BETWEEN ? AND ?
            ), 0) AS spent
     FROM budgets b
     WHERE b.month = ?
     ORDER BY b.amount DESC;`,
    [start, end, month],
  );
}
