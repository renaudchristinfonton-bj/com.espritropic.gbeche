/**
 * GBECHE — Planification des notifications locales natives.
 *
 * Les instances d'adversaires sont matérielles dans SQLite ; ce service
 * calcule l'écart entre les notifications déjà programmées au niveau du
 * système d'exploitation et les instances à venir, puis ne crée/annule
 * que le strict nécessaire (idempotent, appelable souvent sans coût).
 *
 * Sur web, la planification d'un onglet fermé n'existe pas : on s'appuie
 * sur le sondage de reminders.service + la Notification API.
 */
import { Platform } from 'react-native';

import { getSetting, setSetting, SETTING_KEYS } from '../db/settings';
import { listInstancesInRange } from '../db/repositories/adversaries.repo';
import { getWar } from '../db/repositories/wars.repo';
import { getBattle } from '../db/repositories/battles.repo';
import type { AdversaryRow } from '../db/types';
import { formatTime } from './format';
import {
  cancelScheduledReminder,
  getNotificationPermission,
  scheduleReminder,
  cancelAllScheduledReminders,
} from './notifications.service';
import {
  planReminderSync,
  type DesiredReminder,
  type ScheduledMap,
} from '../utils/reminderPlan';

const HORIZON_DAYS = 7;
const DAY_MS = 86_400_000;

function readScheduledMap(): ScheduledMap {
  try {
    const raw = getSetting(SETTING_KEYS.scheduledReminders);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ScheduledMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Construit le titre/le corps d'une notification pour une instance. */
export async function buildReminderContent(instance: AdversaryRow): Promise<{
  title: string;
  body: string;
}> {
  const [war, battle] = await Promise.all([
    getWar(instance.war_id),
    getBattle(instance.battle_id),
  ]);
  const context = war?.title ?? battle?.title ?? 'GBECHE';
  const body = `${context} — prévu à ${formatTime(instance.scheduled_at)} · ${instance.duration_min} min`;
  return { title: instance.title, body };
}

/**
 * Synchronise les notifications système avec les missions des 7 prochains
 * jours. Sans permission ou si les notifications sont désactivées, la
 * fonction ne touche à rien (le centre de rappels in-app reste actif).
 * @returns nombre de notifications nouvellement programmées.
 */
export async function syncReminderSchedule(): Promise<number> {
  // Le web ne peut pas programmer pour un onglet fermé : sondage dédié.
  if (Platform.OS === 'web') return 0;

  const enabled = getSetting(SETTING_KEYS.notificationsEnabled);
  const current = readScheduledMap();

  if (enabled === '0' || enabled === 'false') {
    if (Object.keys(current).length > 0) {
      await cancelAllScheduledReminders();
      await setSetting(SETTING_KEYS.scheduledReminders, JSON.stringify({}));
    }
    return 0;
  }

  const permission = await getNotificationPermission();
  if (permission !== 'granted') return 0;

  const now = Date.now();
  const instances = await listInstancesInRange(now, now + HORIZON_DAYS * DAY_MS);
  const pending = instances.filter(
    (instance) => instance.status === 'pending' || instance.status === 'rescheduled',
  );

  const desired: DesiredReminder[] = [];
  for (const instance of pending) {
    const content = await buildReminderContent(instance);
    desired.push({ id: instance.id, ...content, at: instance.scheduled_at });
  }

  const plan = planReminderSync(current, desired, now);

  for (const item of plan.cancel) {
    await cancelScheduledReminder(item.nid);
  }

  let scheduled = 0;
  for (const item of plan.schedule) {
    const nid = await scheduleReminder(item.title, item.body, new Date(item.at));
    if (!nid) continue; // aucun backend de planification (simulateur…)
    plan.nextMap[item.id] = { nid, at: item.at };
    scheduled += 1;
  }

  await setSetting(SETTING_KEYS.scheduledReminders, JSON.stringify(plan.nextMap));
  return scheduled;
}
