/**
 * GBECHE — Écran Agenda.
 * Vue semaine : les 7 jours avec indicateurs de missions, détail du jour
 * sélectionné, tap sur une mission pour la remporter. Sur web, un bandeau
 * permet d'autoriser les notifications système (Notification API).
 */
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/src/services/haptics';

import { Screen } from '@/src/components/ui/Screen';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useTheme } from '@/src/theme/ThemeContext';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import {
  listInstancesForDay,
  listInstancesInRange,
} from '@/src/db/repositories/adversaries.repo';
import { getWar } from '@/src/db/repositories/wars.repo';
import { winAdversary } from '@/src/services/gamification.service';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '@/src/services/notifications.service';
import { useAppStore } from '@/src/store/useAppStore';
import { formatTime } from '@/src/services/format';
import { radius, spacing, typography } from '@/src/theme';
import type { AdversaryRow } from '@/src/db/types';

const DAY_MS = 86_400_000;
const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const iso = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (iso - 1));
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarScreen() {
  const { colors } = useTheme().theme;
  const showXpFeedback = useAppStore((state) => state.showXpFeedback);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      getNotificationPermission().then(setPermission);
    }
  }, []);

  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * DAY_MS - 1), [weekStart]);
  const weekQuery = useRepoQuery(
    () => listInstancesInRange(weekStart.getTime(), weekEnd.getTime()),
    [weekStart.getTime()],
  );
  const dayQuery = useRepoQuery(() => listInstancesForDay(selected), [selected.getTime()]);

  const countByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const instance of weekQuery.data ?? []) {
      const day = new Date(instance.scheduled_at);
      const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [weekQuery.data]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)),
    [weekStart],
  );

  const shiftWeek = (direction: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeekStart((current) => new Date(current.getTime() + direction * 7 * DAY_MS));
  };

  const goToday = () => {
    const now = new Date();
    setSelected(now);
    setWeekStart(startOfWeek(now));
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  const handleWin = async (adversary: AdversaryRow) => {
    if (adversary.status === 'won') return;
    const result = await winAdversary(adversary.id);
    showXpFeedback({
      xpGained: result.xpGained,
      multiplier: result.multiplier,
      combo: result.combo,
      leveledUp: result.leveledUp,
    });
  };

  const instances = dayQuery.data ?? [];
  const today = new Date();

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing[5], paddingBottom: spacing[3] }}>
        <Text style={[styles.title, { color: colors.text }]}>Agenda</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Tes missions planifiées sur 45 jours glissants.
        </Text>
      </View>

      {Platform.OS === 'web' && permission !== 'granted' && permission !== 'unsupported' ? (
        <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[3] }}>
          <GlassCard style={styles.notifCard}>
            <Ionicons name="notifications-circle" size={26} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>Rappels du navigateur</Text>
              <Text style={[styles.notifBody, { color: colors.textMuted }]}>
                Reçois une notification à l'heure de chaque mission, même si l'onglet est au premier plan.
              </Text>
            </View>
            <Button
              label={permission === 'denied' ? 'Bloqué' : 'Activer'}
              size="sm"
              variant={permission === 'denied' ? 'glass' : 'primary'}
              disabled={permission === 'denied'}
              onPress={enableNotifications}
            />
          </GlassCard>
        </View>
      ) : null}

      {/* Navigation de semaine */}
      <View style={styles.weekHeader}>
        <Pressable hitSlop={10} onPress={() => shiftWeek(-1)} style={styles.weekArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.weekLabel, { color: colors.text }]}>
          {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          {' — '}
          {new Date(weekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </Text>
        <Pressable hitSlop={10} onPress={() => shiftWeek(1)} style={styles.weekArrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayScroller}
      >
        {days.map((day) => {
          const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
          const isSelected = sameDay(day, selected);
          const isToday = sameDay(day, today);
          const count = countByDay.get(key) ?? 0;
          return (
            <Pressable
              key={key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelected(day);
              }}
              style={[
                styles.dayCell,
                {
                  backgroundColor: isSelected ? colors.primaryDim : colors.glass,
                  borderColor: isSelected ? colors.primary : colors.glassBorder,
                },
              ]}
            >
              <Text style={[styles.dayName, { color: colors.textMuted }]}>
                {WEEKDAY_SHORT[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </Text>
              <Text style={[styles.dayNumber, { color: isToday ? colors.primary : colors.text }]}>
                {day.getDate()}
              </Text>
              <View style={[styles.dayDot, { backgroundColor: count > 0 ? colors.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.todayRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        {!sameDay(selected, today) ? (
          <Pressable onPress={goToday} hitSlop={8}>
            <Text style={[styles.todayLink, { color: colors.primary }]}>Aujourd'hui</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: 120, gap: spacing[2.5] }}
        showsVerticalScrollIndicator={false}
      >
        {instances.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Aucune mission ce jour"
            description="Les routines et missions ponctuelles programmées apparaîtront ici."
          />
        ) : (
          instances.map((instance) => (
            <TaskRow key={instance.id} instance={instance} onWin={() => handleWin(instance)} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function TaskRow({ instance, onWin }: { instance: AdversaryRow; onWin: () => void }) {
  const { colors } = useTheme().theme;
  const [warName, setWarName] = React.useState<string>('');
  const won = instance.status === 'won';

  React.useEffect(() => {
    getWar(instance.war_id).then((war) => setWarName(war?.title ?? ''));
  }, [instance.war_id]);

  return (
    <GlassCard onPress={onWin} accentColor={won ? colors.success : colors.glassBorder}>
      <View style={styles.taskRow}>
        <View
          style={[
            styles.check,
            {
              borderColor: won ? colors.success : colors.borderStrong,
              backgroundColor: won ? colors.success : 'transparent',
            },
          ]}
        >
          {won ? <Ionicons name="checkmark" size={16} color={colors.textInverse} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[
              styles.taskTitle,
              {
                color: won ? colors.textMuted : colors.text,
                textDecorationLine: won ? 'line-through' : 'none',
              },
            ]}
          >
            {instance.title}
          </Text>
          <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
            {formatTime(instance.scheduled_at)}
            {warName ? ` · ${warName}` : ''} · {instance.duration_min} min · +{instance.xp_reward} XP
          </Text>
        </View>
        <Ionicons
          name={won ? 'shield-checkmark' : 'ellipse-outline'}
          size={22}
          color={won ? colors.success : colors.textTertiary}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.sizes['3xl'], fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: typography.sizes.md, marginTop: 4, lineHeight: 22 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  notifTitle: { fontSize: typography.sizes.base, fontWeight: '800' },
  notifBody: { fontSize: typography.sizes.xs, marginTop: 2, lineHeight: 17 },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  weekArrow: { padding: spacing[1] },
  weekLabel: { fontSize: typography.sizes.base, fontWeight: '800', textTransform: 'capitalize' },
  dayScroller: { paddingHorizontal: spacing[5], gap: spacing[2], paddingBottom: spacing[2] },
  dayCell: {
    width: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing[2.5],
    alignItems: 'center',
    gap: 4,
  },
  dayName: { fontSize: typography.sizes.xs, fontWeight: '700', textTransform: 'uppercase' },
  dayNumber: { fontSize: typography.sizes.lg, fontWeight: '800' },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  todayLink: { fontSize: typography.sizes.base, fontWeight: '700' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: { fontSize: typography.sizes.md, fontWeight: '700' },
  taskMeta: { fontSize: typography.sizes.xs, marginTop: 2, fontWeight: '600' },
});
