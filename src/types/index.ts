// src/types/index.ts
// Définitions TypeScript globales

export interface War {
  id: string;
  title: string;
  icon: string;
  color: string;
  type: 'FINANCE' | 'HEALTH' | 'PROFESSIONAL' | 'SPIRITUAL' | 'SOCIAL' | 'LEISURE';
  createdAt: string;
  updatedAt: string;
}

export interface Battle {
  id: string;
  war_id: string;
  title: string;
  description?: string;
  deadline: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  updatedAt: string;
}

export interface Adversary {
  id: string;
  battle_id: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE';
  recurrence_days?: number[];
  scheduled_at: string;
  completed_at?: string | null;
  status: 'PENDING' | 'WON' | 'LOST';
  reminder?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'MOBILE_MONEY' | 'CASH' | 'BANK' | 'WAVE';
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description?: string;
  timestamp: string;
  receipt_image_path?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  account_id: string;
  category: string;
  limit: number;
  spent: number;
  month: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLog {
  id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  activity: string;
  is_planned: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodLog {
  id: string;
  date: string;
  mood: number; // 1-5
  note?: string;
  createdAt: string;
  updatedAt: string;
}