/**
 * GBECHE — Utilitaires de calendrier (logique pure, testable).
 * Construction d'une grille mensuelle stable et repères de dates,
 * sans dépendance UI ni effet de bord.
 */

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

export interface CalendarCell {
  /** Numéro du jour dans le mois (1..31). */
  day: number;
  /** Mois grégorien (0..11) de la cellule. */
  month: number;
  year: number;
  /** Timestamp minuit de la cellule. */
  timestamp: number;
  /** La cellule appartient-elle au mois affiché (vs débordements) ? */
  inMonth: boolean;
  isToday: boolean;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Construit la grille d'un mois : toujours 6 semaines (42 cellules),
 * semaine commençant le lundi, avec les débordements du mois voisin.
 */
export function buildMonthGrid(year: number, month: number, reference: Date = new Date()): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  // getDay() : 0 = dimanche … 6 = samedi. On ramène sur une base lundi = 0.
  const leading = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - leading);
  const today = startOfDay(reference).getTime();

  const cells: CalendarCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const timestamp = startOfDay(date).getTime();
    cells.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      timestamp,
      inMonth: date.getMonth() === month,
      isToday: timestamp === today,
    });
  }
  return cells;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayKey(date: Date): number {
  return startOfDay(date).getTime();
}

/** Clé de regroupement des missions par jour (timestamp minuit). */
export function dayKeyFromTimestamp(scheduledAt: number): number {
  const date = new Date(scheduledAt);
  return startOfDay(date).getTime();
}

/** Plage [début minuit, fin 23:59:59.999] d'un mois grégorien. */
export function monthRange(year: number, month: number): { start: number; end: number } {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1, 0, 0, 0, -1).getTime();
  return { start, end };
}

/** Libellé de mois « Octobre 2026 » avec capitale. */
export function monthTitle(year: number, month: number): string {
  const label = new Date(year, month, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
