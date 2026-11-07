/**
 * GBECHE — Rappel « guerre qui décroche ».
 *
 * Une fois par jour au maximum, si une guerre a un taux de réussite
 * inférieur à 50 % sur 30 jours ET qu'aucune mission n'y est prévue
 * aujourd'hui, on affiche un rappel in-app qui propose de planifier.
 *
 * Choix de conception :
 *  - aucune notification système : on ne réveille personne pour ça ;
 *  - au plus un rappel par jour, daté en base (préférences clé/valeur) :
 *    aucune migration de schéma ;
 *  - désactivable dans les Réglages ;
 *  - si la lecture échoue, on ne montre rien : mieux vaut rien qu'un
 *    message faux.
 */
import { getSettingBool, getSetting, setSetting, SETTING_KEYS } from '../db/settings';
import { listInstancesForDay, listInstancesInRange } from '../db/repositories/adversaries.repo';
import { listWars } from '../db/repositories/wars.repo';
import { focusWarOf, warBreakdownOf, reviewWindow } from '../domain/review';
import { toDayKey } from '../utils/dayKey';
import type { InAppReminder } from '../store/useAppStore';

export const FOCUS_NUDGE_DAYS = 30;

/**
 * Jour (local) déjà évalué pendant cette session. Évite de relire la base
 * toutes les 30 s quand il n'y a rien à signaler. Remis à zéro au
 * changement de jour et par `resetFocusNudgeMemory` (tests).
 */
let evaluatedDay: string | null = null;

export function resetFocusNudgeMemory(): void {
  evaluatedDay = null;
}

/** Le rappel a-t-il déjà été proposé aujourd'hui ? */
export function alreadyNudgedToday(now: number, stored: string | undefined): boolean {
  if (!stored) return false;
  return stored === toDayKey(now);
}

/**
 * Vérifie et, le cas échéant, émet le rappel.
 * @param sink reçoit le rappel (généralement store.pushReminder).
 * @returns true si un rappel a été émis.
 */
export async function maybeNudgeFragileWar(
  sink: (reminder: InAppReminder) => void,
  now: number = Date.now(),
): Promise<boolean> {
  if (!getSettingBool(SETTING_KEYS.focusNudgeEnabled, true)) return false;
  if (alreadyNudgedToday(now, getSetting(SETTING_KEYS.focusNudgeDate))) return false;
  // Rien de neuf à dire aujourd'hui : on ne relit pas la base.
  if (evaluatedDay === toDayKey(now)) return false;
  evaluatedDay = toDayKey(now);

  try {
    const [wars, instances, today] = await Promise.all([
      listWars(true),
      listInstancesInRange(now - FOCUS_NUDGE_DAYS * 86_400_000, now),
      listInstancesForDay(now),
    ]);
    if (wars.length === 0) return false;

    const lines = warBreakdownOf(instances, wars, reviewWindow(now, FOCUS_NUDGE_DAYS));
    const pendingWarIds = today
      .filter((instance) => instance.status === 'pending' || instance.status === 'rescheduled')
      .map((instance) => instance.war_id);
    const focus = focusWarOf(lines, pendingWarIds);
    if (!focus) return false;

    const rate = focus.completionRate === null ? 0 : Math.round(focus.completionRate * 100);
    sink({
      id: `focus-${focus.id}-${toDayKey(now)}`,
      title: `${focus.title} décroche`,
      body: `${rate} % de réussite sur ${FOCUS_NUDGE_DAYS} jours et rien de prévu aujourd'hui. Planifie une mission courte.`,
      createdAt: now,
      route: '/(app)/wars',
    });
    // On ne marque la date qu'une fois le rappel réellement émis : si la
    // situation se débloque (mission planifiée), aucun rappel n'est perdu.
    await setSetting(SETTING_KEYS.focusNudgeDate, toDayKey(now));
    return true;
  } catch {
    return false;
  }
}
