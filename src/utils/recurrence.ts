/**
 * GBECHE — Calcul des occurrences d'un template d'adversaire.
 * Pur, déterministe et testable : aucune I/O.
 * Les heures sont portées par le template ; on travaille ici sur des dates
 * à minuit, puis le repository ajoute l'heure planifiée.
 */

import type { Frequency } from '../db/types';

export interface RecurrenceInput {
  frequency: Frequency;
  startDate: number; // epoch ms
  endDate: number | null;
  specificDays: number[]; // ISO 1..7 (lundi..dimanche), pour specific_days
  hour: number;
  /** Minute précise (0..59), défaut 0 pour les anciens templates. */
  minute?: number;
  /** Nombre de jours entre deux occurrences, pour 'interval_days'. */
  intervalDays?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ms: number): Date {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d;
}

function atHour(day: Date, hour: number, minute = 0): number {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

function isoWeekday(date: Date): number {
  // JS : 0 dimanche … 6 samedi → ISO : 1 lundi … 7 dimanche
  return date.getDay() === 0 ? 7 : date.getDay();
}

/**
 * Retourne la liste des timestamps planifiés (avec heure) jusqu'à `untilMs`.
 */
export function computeOccurrences(input: RecurrenceInput, untilMs: number): number[] {
  const { frequency, startDate, endDate, specificDays, hour, minute = 0, intervalDays = 0 } = input;
  const horizon = endDate ? Math.min(endDate, untilMs) : untilMs;

  const firstDay = startOfDay(startDate);
  const occurrences: number[] = [];

  if (frequency === 'once') {
    if (startDate <= horizon) occurrences.push(atHour(firstDay, hour, minute));
    return occurrences;
  }

  const cursor = new Date(firstDay);
  const guard = new Date(horizon);

  // Garde-fou : au maximum 3 ans d'itérations quotidiennes.
  let iterations = 0;
  const MAX_ITERATIONS = 366 * 3;
  const step = Math.max(1, Math.floor(intervalDays || 1));

  while (cursor <= guard && iterations < MAX_ITERATIONS) {
    iterations += 1;
    let due = false;
    const dayOffset = Math.round((startOfDay(cursor.getTime()).getTime() - firstDay.getTime()) / DAY_MS);

    switch (frequency) {
      case 'daily':
        due = true;
        break;
      case 'interval_days':
        // Tous les `step` jours à partir du jour de début (step >= 2).
        due = step >= 2 ? dayOffset % step === 0 : true;
        break;
      case 'weekly':
        due = isoWeekday(cursor) === isoWeekday(firstDay);
        break;
      case 'specific_days':
        due = specificDays.includes(isoWeekday(cursor));
        break;
      case 'monthly':
        due = cursor.getDate() === firstDay.getDate();
        // Si le mois courant n'a pas ce jour (ex : 31 février), on l'ignore.
        break;
      case 'yearly':
        due =
          cursor.getDate() === firstDay.getDate() &&
          cursor.getMonth() === firstDay.getMonth();
        break;
    }

    if (due) {
      const scheduled = atHour(cursor, hour, minute);
      if (scheduled >= startDate && scheduled <= horizon) {
        occurrences.push(scheduled);
      }
    }

    // monthly/yearly avancent jour par jour (saut de mois géré par le test).
    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
}

export function addDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}

export function startOfToday(): number {
  return startOfDay(Date.now()).getTime();
}

export function endOfToday(): number {
  const d = startOfDay(Date.now());
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function dayRange(reference: number | Date): { start: number; end: number } {
  const d = new Date(reference);
  const start = startOfDay(d.getTime());
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}
