/**
 * GBECHE — Service Finances.
 * Règles métier : montants positifs validés, agrégats de période,
 * soldes toujours dérivés des transactions (jamais mis en cache).
 */

import {
  createTransaction,
  deleteTransaction,
  expenseBreakdown,
  listTransactions,
  sumByType,
  updateTransaction,
  type CategoryBreakdown,
  type TransactionFilter,
  type UpdateTransactionInput,
} from '../db/repositories/transactions.repo';
import {
  createAccount,
  getTotalBalance,
  listAccountsWithBalance,
  type AccountWithBalance,
  type CreateAccountInput,
} from '../db/repositories/accounts.repo';
import { budgetsWithSpent, upsertBudget, type BudgetWithSpent } from '../db/repositories/budgets.repo';
import type { ID, TransactionRow, TxType } from '../db/types';
import { currentMonthKey, monthKey } from './format';

export interface MonthStats {
  income: number;
  expense: number;
  balance: number;
  month: string;
}

export function monthRange(month: string): { start: number; end: number } {
  const [year, index] = month.split('-').map(Number);
  const start = new Date(year, index - 1, 1).getTime();
  const end = new Date(year, index, 1, 0, 0, 0, -1).getTime();
  return { start, end };
}

export function todayRange(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  return { start, end };
}

export async function addMovement(input: {
  accountId: ID;
  type: TxType;
  amount: number;
  category: string;
  label?: string;
  note?: string;
  timestamp?: Date;
}): Promise<ID> {
  if (!(input.amount > 0)) throw new Error('Saisis un montant supérieur à zéro.');
  return createTransaction({ ...input });
}

export async function editTransaction(
  id: ID,
  input: UpdateTransactionInput,
): Promise<void> {
  if (input.amount !== undefined && !(input.amount > 0)) {
    throw new Error('Saisis un montant supérieur à zéro.');
  }
  await updateTransaction(id, input);
}

export async function removeTransaction(id: ID): Promise<void> {
  await deleteTransaction(id);
}

export async function getMonthStats(month = currentMonthKey()): Promise<MonthStats> {
  const { start, end } = monthRange(month);
  const [income, expense] = await Promise.all([
    sumByType(start, end, 'income'),
    sumByType(start, end, 'expense'),
  ]);
  return { income, expense, balance: income - expense, month };
}

export async function getTodayExpense(): Promise<number> {
  const { start, end } = todayRange();
  return sumByType(start, end, 'expense');
}

export async function getBreakdown(month = currentMonthKey()): Promise<CategoryBreakdown[]> {
  const { start, end } = monthRange(month);
  return expenseBreakdown(start, end);
}

export async function getAccounts(): Promise<AccountWithBalance[]> {
  return listAccountsWithBalance();
}

export async function addAccount(input: CreateAccountInput): Promise<ID> {
  if (!input.name.trim()) throw new Error('Le nom du compte est obligatoire.');
  return createAccount(input);
}

export async function getBalances(): Promise<{ total: number; accounts: AccountWithBalance[] }> {
  const [total, accounts] = await Promise.all([
    getTotalBalance(),
    listAccountsWithBalance(),
  ]);
  return { total, accounts };
}

export async function getTransactions(
  filter: TransactionFilter = {},
): Promise<(TransactionRow & { account_name: string; account_color: string })[]> {
  return listTransactions(filter);
}

export async function getBudgets(month = currentMonthKey()): Promise<BudgetWithSpent[]> {
  return budgetsWithSpent(month);
}

export async function setBudget(category: string, amount: number, month = currentMonthKey()): Promise<void> {
  await upsertBudget(category, amount, month);
}

export { monthKey };
