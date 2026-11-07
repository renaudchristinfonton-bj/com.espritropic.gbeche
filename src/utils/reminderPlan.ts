/**
 * GBECHE — Calcul pur de l'écart de planification des rappels.
 * Aucune dépendance native : facile à tester, et partagé entre le
 * planificateur de notifications système et le centre de rappels in-app.
 */

// Les constructeurs Android plafonnent le nombre d'alarmes : on garde
// une file bornée, le centre de rappels in-app couvre le reste.
export const MAX_SCHEDULED_REMINDERS = 50;

export interface DesiredReminder {
  id: string; // identifiant de l'instance
  title: string;
  body: string;
  at: number; // epoch ms
}

export interface ScheduledEntry {
  nid: string; // identifiant de notification système
  at: number;
}

export type ScheduledMap = Record<string, ScheduledEntry>;

export interface ReminderPlan {
  cancel: { key: string; nid: string }[];
  schedule: DesiredReminder[];
  nextMap: ScheduledMap;
}

/**
 * Compare les notifications déjà programmées avec les instances désirées
 * et produit les actions minimales : annuler les obsolètes, programmer
 * les nouvelles (ou celles dont l'heure a changé), conserver les autres.
 */
export function planReminderSync(
  current: ScheduledMap,
  desired: DesiredReminder[],
  now: number,
): ReminderPlan {
  const future = desired
    .filter((item) => item.at >= now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_SCHEDULED_REMINDERS);
  const desiredKeys = new Set(future.map((item) => item.id));

  const cancel: { key: string; nid: string }[] = [];
  const schedule: DesiredReminder[] = [];
  const nextMap: ScheduledMap = {};

  // Notifications devenues inutiles (mission supprimée, gagnée, hors horizon).
  for (const [key, entry] of Object.entries(current)) {
    if (!desiredKeys.has(key)) {
      cancel.push({ key, nid: entry.nid });
    }
  }

  for (const item of future) {
    const existing = current[item.id];
    if (existing && existing.at === item.at && existing.nid) {
      // Déjà programmé à la bonne heure : on conserve.
      nextMap[item.id] = existing;
    } else {
      if (existing) cancel.push({ key: item.id, nid: existing.nid });
      schedule.push(item);
    }
  }

  return { cancel, schedule, nextMap };
}
