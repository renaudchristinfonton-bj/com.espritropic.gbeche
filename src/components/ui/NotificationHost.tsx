/**
 * GBECHE — Hôte des rappels in-app.
 * Vérifie les missions dues toutes les 30 s et à chaque regain d'activité,
 * puis affiche des bandeaux en haut de l'écran. Sur web, la même vérification
 * déclenche en plus une notification système si la permission est accordée.
 */
import React, { useEffect, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { checkDueReminders } from '../../services/reminders.service';
import { syncReminderSchedule } from '../../services/reminderScheduler.service';
import { maybeNudgeFragileWar } from '../../services/focusNudge.service';
import * as Haptics from '../../services/haptics';

const POLL_INTERVAL_MS = 30_000;

export function NotificationHost() {
  const { colors } = useTheme().theme;
  const reminders = useAppStore((state) => state.reminders);
  const pushReminder = useAppStore((state) => state.pushReminder);
  const dismissReminder = useAppStore((state) => state.dismissReminder);
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const run = () => {
      checkDueReminders((reminder) => {
        if (!mounted.current) return;
        pushReminder(reminder);
      }).catch((error) => console.warn('[reminders]', error));
      // Diff rapide : ne programme que les nouvelles notifications locales.
      syncReminderSchedule().catch((error) =>
        console.warn('[reminders] schedule', error),
      );
      // Rappel « guerre qui décroche » : au plus une fois par jour, et
      // jamais de notification système pour ce cas.
      maybeNudgeFragileWar((reminder) => {
        if (mounted.current) pushReminder(reminder);
      }).catch((error) => console.warn('[focus-nudge]', error));
    };

    run();
    const interval = setInterval(run, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      mounted.current = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [pushReminder]);

  if (reminders.length === 0) return null;

  return (
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.container}>
      {reminders.slice(0, 3).map((reminder) => (
        <Pressable
          key={reminder.id}
          accessibilityRole="button"
          accessibilityHint={reminder.route ? 'Ouvre l’écran concerné' : undefined}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dismissReminder(reminder.id);
            // Seules les routes internes sont acceptées : un rappel ne peut
            // pas faire sortir de l'application.
            if (reminder.route && reminder.route.startsWith('/(app)/')) {
              router.push(reminder.route as never);
            }
          }}
          style={[
            styles.banner,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="notifications" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
              {reminder.title}
            </Text>
            <Text numberOfLines={2} style={[styles.body, { color: colors.textMuted }]}>
              {reminder.body}
            </Text>
          </View>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing[3],
    gap: spacing[2],
    zIndex: 200,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: typography.sizes.md, fontWeight: '800' },
  body: { fontSize: typography.sizes.sm, fontWeight: '600', marginTop: 2 },
});
