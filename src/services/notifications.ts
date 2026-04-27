/**
 * GBECHE — Service de Notifications
 * ─────────────────────────────────────────────────────────
 * Notifications locales avec sons personnalisés.
 * Tout hors-ligne — aucun serveur requis.
 *
 * Sons custom à placer dans :
 *   iOS    : ./assets/sounds/*.wav (ajouter dans Info.plist)
 *   Android: ./android/app/src/main/res/raw/ (sans extension)
 *
 * Fichiers attendus : warrior_morning, victory, streak_sound,
 *                     boss_sound, warning_sound, levelup_sound
 */

import * as Notifications from 'expo-notifications';
import * as Device        from 'expo-device';
import { Platform }       from 'react-native';
import { MMKV }           from 'react-native-mmkv';

// ─── Storage ──────────────────────────────────────────────
const storage = new MMKV({ id: 'gbeche-notifications' });
const PREFS_KEY = 'notif_prefs';

// ─── Config globale ───────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ─── Types ────────────────────────────────────────────────
export interface NotifPreferences {
  morning:   boolean;
  noon:      boolean;
  evening:   boolean;
  hourly:    boolean;
  streak:    boolean;
  boss:      boolean;
  territory: boolean;
}

const DEFAULT_PREFS: NotifPreferences = {
  morning:   true,
  noon:      true,
  evening:   true,
  hourly:    false,
  streak:    true,
  boss:      true,
  territory: true,
};

// ─── Permissions ──────────────────────────────────────────
export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return true; // Simulateur : simuler l'accord

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

// ─── Android Channels ─────────────────────────────────────
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('gbeche-missions', {
    name:             'Missions GBECHE',
    importance:       Notifications.AndroidImportance.HIGH,
    sound:            'warrior_morning',
    vibrationPattern: [0, 300, 200, 300],
    lightColor:       '#00E5FF',
    enableLights:     true,
    enableVibrate:    true,
  });

  await Notifications.setNotificationChannelAsync('gbeche-rewards', {
    name:             'Récompenses',
    importance:       Notifications.AndroidImportance.HIGH,
    sound:            'victory',
    vibrationPattern: [0, 150, 100, 150, 100, 150],
    lightColor:       '#00FF88',
  });

  await Notifications.setNotificationChannelAsync('gbeche-alerts', {
    name:             'Alertes',
    importance:       Notifications.AndroidImportance.DEFAULT,
    sound:            'warning_sound',
    vibrationPattern: [0, 500],
    lightColor:       '#FF6B35',
  });
}

// ─── Sound helper ─────────────────────────────────────────
function sound(name: string): string | undefined {
  if (Platform.OS === 'ios') return `${name}.wav`;
  if (Platform.OS === 'android') return name;
  return undefined;
}

// ─── Preferences ──────────────────────────────────────────
export function getNotifPreferences(): NotifPreferences {
  const stored = storage.getString(PREFS_KEY);
  return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
}

export function saveNotifPreferences(prefs: Partial<NotifPreferences>): void {
  const current = getNotifPreferences();
  storage.set(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
}

// ─── Schedulers ───────────────────────────────────────────
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Notification immédiate (gamification) */
export async function sendNotification(title: string, body: string, soundName = 'victory'): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: sound(soundName),
        data: { screen: 'home' },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[GBECHE Notif]', e);
  }
}

/** Réveil du Guerrier — 6h30 tous les jours */
export async function scheduleMorning(hour = 6, minute = 30): Promise<void> {
  const { morning } = getNotifPreferences();
  if (!morning) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'gbeche_morning',
    content: {
      title: 'Le Guerrier s\'éveille',
      body:  'Tes ordres de mission sont prêts. Aujourd\'hui, tu conquiers.',
      sound: sound('warrior_morning'),
      data:  { screen: 'home' },
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

/** Vérification mi-journée */
export async function scheduleNoon(hour = 12, minute = 0): Promise<void> {
  const { noon } = getNotifPreferences();
  if (!noon) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'gbeche_noon',
    content: {
      title: 'Mi-journée',
      body:  'Comment avance la bataille ? Coche tes adversaires vaincus.',
      sound: sound('victory'),
      data:  { screen: 'home' },
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

/** Bilan du soir */
export async function scheduleEvening(hour = 21, minute = 0): Promise<void> {
  const { evening } = getNotifPreferences();
  if (!evening) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'gbeche_evening',
    content: {
      title: 'Bilan du soir',
      body:  'Combien de batailles as-tu gagnées aujourd\'hui ?',
      sound: sound('streak_sound'),
      data:  { screen: 'home' },
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

/** Streak en danger — 23h */
export async function scheduleStreakWarning(): Promise<void> {
  const { streak } = getNotifPreferences();
  if (!streak) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'gbeche_streak',
    content: {
      title: 'Ton Streak est en danger !',
      body:  'Il te reste 1h pour maintenir ta Flamme de Guerre. Agis maintenant.',
      sound: sound('warning_sound'),
      data:  { screen: 'home' },
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour:    23,
      minute:  0,
      repeats: true,
    },
  });
}

/** Boss Battle hebdomadaire — dimanche 20h */
export async function scheduleBoss(): Promise<void> {
  const { boss } = getNotifPreferences();
  if (!boss) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'gbeche_boss',
    content: {
      title: 'Le Boss attend !',
      body:  'Le boss hebdomadaire expire ce soir. Peux-tu encore le vaincre ?',
      sound: sound('boss_sound'),
      data:  { screen: 'wars' },
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: 1, // Dimanche
      hour:    20,
      minute:  0,
      repeats: true,
    },
  });
}

/** Rappels horaires pour créneaux libres (9h–21h) */
export async function scheduleHourlyNotifications(): Promise<void> {
  const { hourly } = getNotifPreferences();
  if (!hourly) return;

  const bodies = [
    'Qu\'as-tu accompli cette heure ? Enregistre.',
    '1h s\'est écoulée. Comment as-tu occupé ce temps ?',
    'Compte-rendu horaire. Que s\'est-il passé ?',
  ];

  for (let h = 9; h <= 21; h++) {
    await Notifications.scheduleNotificationAsync({
      identifier: `gbeche_hourly_${h}`,
      content: {
        title: 'Suivi horaire',
        body:  bodies[h % bodies.length],
        sound: undefined,
        data:  { screen: 'calendar' },
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour:    h,
        minute:  0,
        repeats: true,
      },
    });
  }
}

/** Sons gamification immédiats */
export async function playGamificationSound(
  type: 'victory' | 'levelup' | 'boss' | 'streak' | 'achievement' | 'combo'
): Promise<void> {
  const soundMap: Record<string, string> = {
    victory:     'victory',
    levelup:     'levelup_sound',
    boss:        'boss_sound',
    streak:      'streak_sound',
    achievement: 'victory',
    combo:       'victory',
  };

  const titles: Record<string, { title: string; body: string }> = {
    victory:     { title: 'Adversaire vaincu !',   body: 'Continue la bataille.' },
    levelup:     { title: 'Niveau supérieur !',     body: 'Tu progresses.' },
    boss:        { title: 'Boss vaincu !',          body: 'Récompense rare obtenue.' },
    streak:      { title: 'Streak maintenu !',      body: 'La flamme brûle.' },
    achievement: { title: 'Nouvelle Médaille',      body: 'Tu mérites cette récompense.' },
    combo:       { title: 'COMBO !',                body: 'Tu es en feu !' },
  };

  const { title, body } = titles[type];
  await sendNotification(title, body, soundMap[type]);
}

/** Initialisation complète au démarrage */
export async function initNotifications(): Promise<void> {
  await setupAndroidChannels();
  const granted = await requestPermissions();
  if (!granted) return;

  await cancelAll();
  await Promise.all([
    scheduleMorning(),
    scheduleNoon(),
    scheduleEvening(),
    scheduleStreakWarning(),
    scheduleBoss(),
  ]);
}

/** Listener sur tap de notification */
export function listenForNotifications(callback: (notification: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/** Listener sur réception (foreground) */
export function listenForeground(callback: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}