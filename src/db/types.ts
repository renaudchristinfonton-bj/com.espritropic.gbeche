/**
 * GBECHE — Types du domaine et types de lignes SQLite.
 * Les tables utilisent des entiers epoch millisecondes et des booléens 0/1.
 */

export type ID = string;

// ─── Guerres ──────────────────────────────────────────────
export type DomainType =
  | 'finance'
  | 'health'
  | 'career'
  | 'spiritual'
  | 'family'
  | 'education'
  | 'leisure'
  | 'custom';

export interface WarRow {
  id: ID;
  title: string;
  icon: string; // nom Ionicons
  color: string; // hex
  domain_type: DomainType;
  xp_earned: number;
  is_active: number; // 0 | 1
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// ─── Batailles ────────────────────────────────────────────
export type BattleStatus = 'active' | 'won' | 'lost';
export type Priority = 'low' | 'medium' | 'high';

export interface BattleRow {
  id: ID;
  war_id: ID;
  title: string;
  description: string;
  deadline: number | null;
  status: BattleStatus;
  priority: Priority;
  xp_reward: number;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

// ─── Adversaires ──────────────────────────────────────────
export type Frequency =
  | 'once'
  | 'daily'
  | 'interval_days'
  | 'weekly'
  | 'specific_days'
  | 'monthly'
  | 'yearly';

export type AdversaryStatus = 'pending' | 'won' | 'lost' | 'rescheduled';

export interface AdversaryTemplateRow {
  id: ID;
  battle_id: ID;
  war_id: ID;
  title: string;
  xp_reward: number;
  frequency: Frequency;
  specific_days: string; // JSON : [1, 4] (lundi, jeudi — ISO 1..7)
  hour: number; // 0..23
  minute: number; // 0..59
  interval_days: number; // >= 2 quand frequency = 'interval_days', sinon 0
  duration_min: number;
  start_date: number;
  end_date: number | null;
  is_active: number;
  created_at: number;
}

export interface AdversaryRow {
  id: ID;
  template_id: ID | null;
  battle_id: ID;
  war_id: ID;
  title: string;
  xp_reward: number;
  scheduled_at: number;
  hour: number;
  minute: number; // 0..59
  duration_min: number;
  status: AdversaryStatus;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

// ─── Finances ─────────────────────────────────────────────
export type AccountType = 'mobile_money' | 'cash' | 'bank' | 'wave';

export interface AccountRow {
  id: ID;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  initial_balance: number;
  currency: string;
  is_default: number;
  is_archived: number;
  created_at: number;
  updated_at: number;
}

export type TxType = 'income' | 'expense' | 'transfer';

export interface TransactionRow {
  id: ID;
  account_id: ID;
  amount: number; // signé : + revenu, - dépense
  type: TxType;
  category: string;
  label: string;
  note: string;
  is_recurring: number;
  timestamp: number;
  created_at: number;
}

export interface BudgetRow {
  id: ID;
  category: string;
  amount: number;
  period: 'monthly' | 'yearly';
  month: string; // YYYY-MM
  created_at: number;
}

// Catégorie personnalisée (les catégories du catalogue statique n'ont
// pas de ligne : seules les créations utilisateur sont persistées).
export type CategoryKind = 'expense' | 'income';

export interface CategoryRow {
  id: ID;
  label: string;
  icon: string; // nom Ionicons
  color: string; // hex
  kind: CategoryKind;
  is_custom: number; // 0 | 1
  created_at: number;
}

// ─── Gamification ─────────────────────────────────────────
export interface GamificationRow {
  id: number;
  xp: number;
  level: number;
  streak: number;
  shields: number;
  wins: number;
  losses: number;
  combo: number;
  best_combo: number;
  medals: string; // JSON array
  last_active: string | null; // YYYY-MM-DD
  updated_at: number;
}

// ─── Phase 2 (tables réservées) ───────────────────────────
export interface TimeLogRow {
  id: ID;
  adversary_id: ID | null;
  activity: string;
  category: string;
  start_time: number;
  end_time: number;
  is_planned: number;
  war_id: ID | null;
  created_at: number;
}

export interface MoodLogRow {
  id: ID;
  score: number;
  note: string;
  timestamp: number;
}

export interface HealthLogRow {
  id: ID;
  sleep_hours: number;
  water_liters: number;
  weight_kg: number;
  sport_minutes: number;
  sport_type: string;
  timestamp: number;
}

export interface ChatMessageRow {
  id: ID;
  role: 'user' | 'agent';
  text: string;
  intents_json: string;
  created_at: number;
}
