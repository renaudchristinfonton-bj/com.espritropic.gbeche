/**
 * GBECHE — Service catégories financières.
 * Fusionne le catalogue statique (intégré à l'app) avec les catégories
 * personnalisées persistées dans SQLite. Les écrans ne consomment que
 * cette fusion, jamais la table seule.
 */
import { CATEGORIES, type CategoryMeta, type IconName } from '../domain/catalog';
import {
  createCategory,
  listCategories,
  type CreateCategoryInput,
} from '../db/repositories/categories.repo';
import type { CategoryKind, CategoryRow, ID } from '../db/types';

function toMeta(row: CategoryRow): CategoryMeta {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon as IconName,
    color: row.color,
    kind: row.kind,
  };
}

/** Catégories proposées pour un type de mouvement (statique + personnalisé). */
export async function getCategoryOptions(kind: CategoryKind): Promise<CategoryMeta[]> {
  const custom = await listCategories(kind);
  const base =
    kind === 'expense'
      ? CATEGORIES.filter((category) => category.kind !== 'income')
      : CATEGORIES.filter((category) => category.kind !== 'expense');
  return [...base, ...custom.map(toMeta)];
}

/** Toutes les métas (statique + personnalisé), pour résoudre un id à l'affichage. */
export async function getAllCategoryMetas(): Promise<CategoryMeta[]> {
  const custom = await listCategories();
  return [...CATEGORIES, ...custom.map(toMeta)];
}

export async function addCustomCategory(
  input: CreateCategoryInput,
): Promise<ID> {
  return createCategory(input);
}

export type { CategoryKind };
