/**
 * GBECHE — Planificateur de rappels.
 * Inspecte les instances planifiées du jour et déclenche :
 *  - une notification système (expo-notifications en natif, Notification
 *    API sur web) ;
 *  - un rappel in-app visible via NotificationHost dans tous les cas.
 * Les notifications planifiées à l'avance (app fermée) sont gérées par
 * reminderScheduler.service ; ce sondage couvre l'app ouverte et le web.
 * Les IDs déjà notifiés sont persistés dans les préférences pour ne pas
 * re-déclencher après rechargement.
 */
import { getSetting, setSetting, SETTING_KEYS } from '../db/settings';
import { listInstancesForDay } from '../db/repositories/adversaries.repo';
import { getWar } from '../db/repositories/wars.repo';
import { getBattle } from '../db/repositories/battles.repo';
import { presentNotification } from './notifications.service';
import type { InAppReminder } from '../store/useAppStore';
import { formatTime } from './format';

const MAX_PERSISTED_IDS = 1000;

function readNotifiedIds(): Set<string> {
  try {
    const raw = getSetting(SETTING_KEYS.notifiedInstanceIds);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function persistNotifiedIds(ids: Set<string>): Promise<void> {
  const trimmed = Array.from(ids).slice(-MAX_PERSISTED_IDS);
  await setSetting(SETTING_KEYS.notifiedInstanceIds, JSON.stringify(trimmed));
}

/**
 * Vérifie les missions arrivées à échéance aujourd'hui.
 * @param sink reçoit les rappels in-app (généralement store.pushReminder).
 * @returns nombre de nouveaux rappels déclenchés.
 */
export async function checkDueReminders(
  sink: (reminder: InAppReminder) => void,
): Promise<number> {
  const instances = await listInstancesForDay(new Date());
  const notified = readNotifiedIds();
  const now = Date.now();
  let triggered = 0;

  for (const instance of instances) {
    if (instance.status !== 'pending' && instance.status !== 'rescheduled') continue;
    if (instance.scheduled_at > now) continue;
    if (notified.has(instance.id)) continue;

    const [war, battle] = await Promise.all([
      getWar(instance.war_id),
      getBattle(instance.battle_id),
    ]);
    const context = war?.title ?? battle?.title ?? 'GBECHE';
    const body = `Prévu à ${formatTime(instance.scheduled_at)} · ${instance.duration_min} min`;

    await presentNotification(instance.title, `${context} — ${body}`);
    sink({
      id: instance.id,
      title: instance.title,
      body: `${context} · ${body}`,
      createdAt: now,
    });

    notified.add(instance.id);
    triggered += 1;
  }

  if (triggered > 0) {
    await persistNotifiedIds(notified);
  }
  return triggered;
}
