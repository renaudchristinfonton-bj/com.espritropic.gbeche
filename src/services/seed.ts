/**
 * GBECHE — Amorçage initial.
 * Crée les guerres par défaut une seule fois (flag settings.seeded),
 * et garantit l'existence du profil de gamification.
 */

import { countActiveWars, createWar } from '../db/repositories/wars.repo';
import { getProfile } from '../db/repositories/gamification.repo';
import { getSettingBool, setSettingBool, SETTING_KEYS } from '../db/settings';
import { DEFAULT_WARS } from '../domain/catalog';

export async function seedDefaults(): Promise<void> {
  await getProfile();

  const alreadySeeded = getSettingBool(SETTING_KEYS.seeded, false);
  if (alreadySeeded) return;

  const existing = await countActiveWars();
  if (existing === 0) {
    for (const war of DEFAULT_WARS) {
      await createWar({
        title: war.title,
        icon: war.icon,
        color: war.color,
        domainType: war.domainType,
      });
    }
  }

  await setSettingBool(SETTING_KEYS.seeded, true);
}
