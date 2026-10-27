/**
 * Repository — Catégories financières personnalisées.
 * Le catalogue statique (src/domain/catalog.ts) fournit les catégories
 * par défaut ; seules les créations de l'utilisateur sont en base.
 */

import { all, first, newId, run } from '../client';
import type { CategoryKind, CategoryRow, ID } from '../types';

export interface CreateCategoryInput {
  label: string;
  icon: string;
  color: string;
  kind: CategoryKind;
}

export async function listCategories(kind?: CategoryKind): Promise<CategoryRow[]> {
  if (kind) {
    return all<CategoryRow>(
      'SELECT * FROM categories WHERE kind = ? ORDER BY created_at ASC;',
      [kind],
    );
  }
  return all<CategoryRow>('SELECT * FROM categories ORDER BY created_at ASC;');
}

export async function getCategory(id: ID): Promise<CategoryRow | null> {
  return first<CategoryRow>('SELECT * FROM categories WHERE id = ?;', [id]);
}

/** Une catégorie est-elle déjà référencée par une transaction ou un budget ? */
export async function categoryInUse(id: ID): Promise<boolean> {
  const tx = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM transactions WHERE category = ?;',
    [id],
  );
  if ((tx?.n ?? 0) > 0) return true;
  const budget = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM budgets WHERE category = ?;',
    [id],
  );
  return (budget?.n ?? 0) > 0;
}

export async function createCategory(input: CreateCategoryInput): Promise<ID> {
  const label = input.label.trim();
  if (!label) throw new Error('Le nom de la catégorie est obligatoire.');

  const duplicate = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM categories WHERE label = ? AND kind = ?;',
    [label, input.kind],
  );
  if ((duplicate?.n ?? 0) > 0) {
    throw new Error('Une catégorie avec ce nom existe déjà.');
  }

  const id = newId();
  await run(
    `INSERT INTO categories (id, label, icon, color, kind, is_custom, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?);`,
    [id, label, input.icon, input.color, input.kind, Date.now()],
  );
  return id;
}

export async function deleteCategory(id: ID): Promise<void> {
  if (await categoryInUse(id)) {
    throw new Error(
      'Cette catégorie est utilisée par des transactions ou des budgets : elle ne peut pas être supprimée.',
    );
  }
  await run('DELETE FROM categories WHERE id = ?;', [id]);
}
