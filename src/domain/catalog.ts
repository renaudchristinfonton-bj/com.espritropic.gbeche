/**
 * GBECHE — Catalogue métier : valeurs affichables, icônes, présélections.
 * Centralise les énumérations exposées à l'UI (aucun composant ne duplique
 * ces libellés/couleurs).
 */

import type { Ionicons } from '@expo/vector-icons';

import type { AccountType, DomainType, Frequency, Priority } from '../db/types';

export type IconName = keyof typeof Ionicons.glyphMap;

// ─── Guerres par défaut ───────────────────────────────────
export interface DefaultWar {
  title: string;
  icon: IconName;
  color: string;
  domainType: DomainType;
}

export const DEFAULT_WARS: DefaultWar[] = [
  { title: 'Finance', icon: 'wallet', color: '#FFD700', domainType: 'finance' },
  { title: 'Santé & Physique', icon: 'fitness', color: '#00FF88', domainType: 'health' },
  { title: 'Carrière & Business', icon: 'briefcase', color: '#00E5FF', domainType: 'career' },
  { title: 'Spirituel & Mental', icon: 'leaf', color: '#A78BFA', domainType: 'spiritual' },
  { title: 'Famille & Relations', icon: 'people', color: '#FF6B35', domainType: 'family' },
  { title: 'Éducation & Savoir', icon: 'book', color: '#FF9F43', domainType: 'education' },
  { title: 'Loisirs & Détente', icon: 'game-controller', color: '#6366F1', domainType: 'leisure' },
];

// ─── Comptes prédéfinis ───────────────────────────────────
export interface AccountPreset {
  name: string;
  type: AccountType;
  icon: IconName;
  color: string;
}

export const ACCOUNT_PRESETS: AccountPreset[] = [
  { name: 'MTN MoMo', type: 'mobile_money', icon: 'phone-portrait', color: '#FFCC00' },
  { name: 'Wave', type: 'wave', icon: 'water', color: '#1DA1F2' },
  { name: 'Orange Money', type: 'mobile_money', icon: 'phone-portrait-outline', color: '#FF7900' },
  { name: 'Cash', type: 'cash', icon: 'cash', color: '#00FF88' },
  { name: 'Banque', type: 'bank', icon: 'business', color: '#00E5FF' },
];

// ─── Catégories de dépenses / revenus ─────────────────────
export interface CategoryMeta {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  kind: 'expense' | 'income' | 'both';
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'food', label: 'Alimentation', icon: 'restaurant', color: '#FF9F43', kind: 'expense' },
  { id: 'transport', label: 'Transport', icon: 'car', color: '#00E5FF', kind: 'expense' },
  { id: 'health', label: 'Santé & Beauté', icon: 'medkit', color: '#00FF88', kind: 'expense' },
  { id: 'rent', label: 'Loyer', icon: 'home', color: '#A78BFA', kind: 'expense' },
  { id: 'utilities', label: 'Factures', icon: 'flash', color: '#FFCC00', kind: 'expense' },
  { id: 'leisure', label: 'Loisirs', icon: 'film', color: '#6366F1', kind: 'expense' },
  { id: 'education', label: 'Éducation', icon: 'school', color: '#FF6B35', kind: 'expense' },
  { id: 'savings', label: 'Épargne', icon: 'save', color: '#00FF88', kind: 'expense' },
  { id: 'other_expense', label: 'Autres dépenses', icon: 'ellipsis-horizontal', color: '#8E94A8', kind: 'expense' },
  { id: 'salary', label: 'Salaire', icon: 'cash', color: '#00FF88', kind: 'income' },
  { id: 'business', label: 'Revenu business', icon: 'trending-up', color: '#00E5FF', kind: 'income' },
  { id: 'gift', label: 'Don / Cadeau reçu', icon: 'gift', color: '#FFD700', kind: 'income' },
  { id: 'other_income', label: 'Autres revenus', icon: 'add-circle', color: '#8E94A8', kind: 'income' },
];

// Présélections pour la création d'une catégorie personnalisée.
export const CATEGORY_ICON_CHOICES = [
  'pricetag',
  'cart',
  'gift',
  'airplane',
  'phone-portrait',
  'musical-notes',
  'paw',
  'football',
  'baby',
  'wrench',
  'cloud',
  'sparkles',
] as const;

export const CATEGORY_COLOR_CHOICES = [
  '#FFD700',
  '#00FF88',
  '#00E5FF',
  '#A78BFA',
  '#FF6B35',
  '#FF9F43',
  '#6366F1',
  '#FF4757',
] as const;

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): CategoryMeta {
  return (
    CATEGORY_MAP.get(id) ?? {
      id,
      label: id,
      icon: 'pricetag' as IconName,
      color: '#8E94A8',
      kind: 'both' as const,
    }
  );
}

export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.kind !== 'income');
export const INCOME_CATEGORIES = CATEGORIES.filter((c) => c.kind !== 'expense');

// ─── Récurrence ───────────────────────────────────────────
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: 'Une seule fois',
  daily: 'Tous les jours',
  interval_days: 'Tous les N jours',
  weekly: 'Chaque semaine',
  specific_days: 'Jours précis',
  monthly: 'Chaque mois',
  yearly: 'Chaque année',
};

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ─── Priorité ─────────────────────────────────────────────
export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Basse', color: '#8E94A8' },
  medium: { label: 'Moyenne', color: '#00E5FF' },
  high: { label: 'Haute', color: '#FF4757' },
};
