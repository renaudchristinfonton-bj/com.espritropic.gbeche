/**
 * GBECHE — Clés de jour locales.
 *
 * Toute l'application raisonne en jours calendaires LOCAUX : une mission
 * gagnée à 23 h 30 doit compter pour le jour qu'affiche l'utilisateur, pas
 * pour la veille en UTC. Utiliser `toDateString()`/`toISOString()` pour
 * fabriquer une clé produit un décalage d'un jour dès que le fuseau est
 * positif (Abidjan UTC+0, Cotonou UTC+1, Paris UTC+2).
 *
 * Ces fonctions sont pures : mêmes entrées → mêmes sorties, quel que soit
 * le fuseau de la machine qui exécute les tests (elles utilisent les
 * getters locaux de Date, jamais leur version UTC).
 */

export const DAY_MS = 86_400_000;

/** Minuit local du jour contenant `ms`. */
export function startOfDayMs(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Clé `YYYY-MM-DD` du jour local contenant `ms`. */
export function toDayKey(ms: number): string {
  const date = new Date(ms);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Minuit local correspondant à une clé `YYYY-MM-DD` (null si invalide). */
export function dayKeyToMs(key: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Rejette les dates inexistantes (31 février → 3 mars).
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date.getTime();
}

/**
 * Les `count` dernières clés de jour, du plus ancien au plus récent,
 * le dernier jour étant celui de `endMs`. Le calcul passe par le calendrier
 * (setDate) et non par une soustraction de millisecondes : les changements
 * d'heure ne décalent donc jamais la liste.
 */
export function lastDayKeys(endMs: number, count: number): string[] {
  if (count <= 0) return [];
  const keys: string[] = [];
  const cursor = new Date(endMs);
  cursor.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - i);
    keys.push(toDayKey(day.getTime()));
  }
  return keys;
}
