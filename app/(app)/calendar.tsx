/**
 * GBECHE — Écran Agenda (refonte visuelle).
 *
 * Calendrier mensuel professionnel : grille 7 colonnes avec indicateurs
 * de missions, jour courant et sélection, statistiques du jour choisi,
 * puis timeline verticale des missions tap-to-win. Sur web, un bandeau
 * permet d'autoriser les notifications système.
 */
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/src/services/haptics';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
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
import { SCREEN_BOTTOM_PADDING } from '@/src/theme/layout';
import type { AdversaryRow } from '@/src/db/types';
import {
  buildMonthGrid,
  dayKeyFromTimestamp,
  monthRange,
  monthTitle,
  sameDay,
  WEEKDAY_LABELS,
  type CalendarCell,
} from '@/src/utils/calendar';

export default function CalendarScreen() {
  const { colors } = useTheme().theme;
  const showXpFeedback = useAppStore((state) => state.showXpFeedback);

  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selected, setSelected] = useState(() => new Date());
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      getNotificationPermission().then(setPermission);
    }
  }, []);

  const range = useMemo(() => monthRange(cursor.year, cursor.month), [cursor]);
  const monthQuery = useRepoQuery(
    () => listInstancesInRange(range.start, range.end),
    [range.start, range.end],
  );
  const dayQuery = useRepoQuery(() => listInstancesForDay(selected), [selected.getTime()]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, today),
    [cursor, today],
  );

  const { totalByDay, wonByDay } = useMemo(() => {
    const totals = new Map<number, number>();
    const wins = new Map<number, number>();
    for (const instance of monthQuery.data ?? []) {
      const key = dayKeyFromTimestamp(instance.scheduled_at);
      totals.set(key, (totals.get(key) ?? 0) + 1);
      if (instance.status === 'won') wins.set(key, (wins.get(key) ?? 0) + 1);
    }
    return { totalByDay: totals, wonByDay: wins };
  }, [monthQuery.data]);

  const shiftMonth = (direction: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCursor((current) => {
      const next = new Date(current.year, current.month + direction, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const goToday = () => {
    const now = new Date();
    setSelected(now);
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
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
  const dayWon = instances.filter((i) => i.status === 'won').length;
  const dayPending = instances.filter((i) => i.status === 'pending' || i.status === 'rescheduled').length;

  return (
    <Screen padded={false} scroll contentContainerStyle={styles.screenContent}>
      <ScreenHeader
        title="Agenda"
        subtitle="Tes batailles planifiées et ton score de constance, jour par jour."
      />

      {Platform.OS === 'web' && permission !== 'granted' && permission !== 'unsupported' ? (
        <View style={styles.notifWrap}>
          <GlassCard style={styles.notifCard}>
            <Ionicons name="notifications-circle" size={26} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>Rappels du navigateur</Text>
              <Text style={[styles.notifBody, { color: colors.textMuted }]}>
                Reçois une notification à l'heure de chaque mission.
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

      {/* ─── Calendrier mensuel ─── */}
      <GlassCard animated={false} style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Mois précédent"
            onPress={() => shiftMonth(-1)}
            style={[styles.monthArrow, { borderColor: colors.glassBorder }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {monthTitle(cursor.year, cursor.month)}
          </Text>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Mois suivant"
            onPress={() => shiftMonth(1)}
            style={[styles.monthArrow, { borderColor: colors.glassBorder }]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={[styles.weekLabel, { color: colors.textTertiary }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((cell) => (
            <MonthCell
              key={cell.timestamp}
              cell={cell}
              selected={sameDay(new Date(cell.timestamp), selected)}
              total={totalByDay.get(cell.timestamp) ?? 0}
              won={wonByDay.get(cell.timestamp) ?? 0}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelected(new Date(cell.timestamp));
              }}
            />
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Mission</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Tout gagné</Text>
          </View>
          {!sameDay(selected, today) ? (
            <Pressable onPress={goToday} hitSlop={8} style={styles.todayButton}>
              <Ionicons name="today-outline" size={14} color={colors.primary} />
              <Text style={[styles.todayLink, { color: colors.primary }]}>Aujourd'hui</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>

      {/* ─── Jour sélectionné ─── */}
      <View style={styles.dayHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayTitle, { color: colors.text }]}>
            {selected.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <StatChip icon="flag" value={instances.length} label="missions" tint={colors.primaryDim} color={colors.primary} />
        <StatChip icon="checkmark-circle" value={dayWon} label="gagnées" tint={colors.successDim} color={colors.success} />
        <StatChip icon="time-outline" value={dayPending} label="à mener" tint={colors.warningDim} color={colors.warning} />
      </View>

      <View style={styles.timelineSection}>
        {instances.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Aucune mission ce jour"
            description="Les routines et missions ponctuelles programmées apparaîtront ici."
          />
        ) : (
          instances.map((instance, index) => (
            <TimelineRow
              key={instance.id}
              instance={instance}
              isLast={index === instances.length - 1}
              onWin={() => handleWin(instance)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function MonthCell({
  cell,
  selected,
  total,
  won,
  onPress,
}: {
  cell: CalendarCell;
  selected: boolean;
  total: number;
  won: number;
  onPress: () => void;
}) {
  const { colors } = useTheme().theme;
  const allWon = total > 0 && won === total;

  return (
    <Pressable
      onPress={cell.inMonth ? onPress : undefined}
      disabled={!cell.inMonth}
      style={styles.cell}
      accessibilityRole="button"
      accessibilityLabel={`${cell.day}${total > 0 ? `, ${total} mission(s)` : ''}`}
    >
      <View
        style={[
          styles.cellInner,
          selected && { backgroundColor: colors.primary },
          !selected && cell.isToday && { borderColor: colors.primary, borderWidth: 1.5 },
          !cell.inMonth && { opacity: 0.32 },
        ]}
      >
        <Text
          style={[
            styles.cellNumber,
            {
              color: selected
                ? colors.textInverse
                : cell.isToday
                  ? colors.primary
                  : colors.text,
            },
          ]}
        >
          {cell.day}
        </Text>
        <View
          style={[
            styles.cellDot,
            {
              backgroundColor: total === 0 ? 'transparent' : selected ? colors.textInverse : allWon ? colors.success : colors.accent,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function StatChip({
  icon,
  value,
  label,
  tint,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  tint: string;
  color: string;
}) {
  const { colors } = useTheme().theme;
  return (
    <GlassCard animated={false} style={styles.statChip}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

function TimelineRow({
  instance,
  isLast,
  onWin,
}: {
  instance: AdversaryRow;
  isLast: boolean;
  onWin: () => void;
}) {
  const { colors } = useTheme().theme;
  const [warName, setWarName] = React.useState('');
  const won = instance.status === 'won';

  React.useEffect(() => {
    getWar(instance.war_id).then((war) => setWarName(war?.title ?? ''));
  }, [instance.war_id]);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineNode,
            { backgroundColor: won ? colors.success : colors.primaryDim },
          ]}
        >
          <Ionicons
            name={won ? 'checkmark' : 'ellipse'}
            size={won ? 12 : 8}
            color={won ? colors.textInverse : colors.primary}
          />
        </View>
        {!isLast ? <View style={[styles.timelineLine, { backgroundColor: colors.glassBorderHover }]} /> : null}
      </View>

      <GlassCard
        onPress={onWin}
        accentColor={won ? colors.success : colors.glassBorder}
        style={styles.timelineCard}
      >
        <Text style={[styles.timelineTime, { color: colors.primary }]}>
          {formatTime(instance.scheduled_at)}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.timelineTitle,
            {
              color: won ? colors.textMuted : colors.text,
              textDecorationLine: won ? 'line-through' : 'none',
            },
          ]}
        >
          {instance.title}
        </Text>
        <View style={styles.timelineMetaRow}>
          {warName ? (
            <View style={[styles.metaTag, { backgroundColor: colors.glass }]}>
              <Text style={[styles.metaTagText, { color: colors.textMuted }]} numberOfLines={1}>
                {warName}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.timelineMeta, { color: colors.textTertiary }]}>
            {instance.duration_min} min · +{instance.xp_reward} XP
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: SCREEN_BOTTOM_PADDING },
  notifWrap: { paddingHorizontal: spacing[5], marginBottom: spacing[3] },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  notifTitle: { fontSize: typography.sizes.base, fontWeight: '800' },
  notifBody: { fontSize: typography.sizes.xs, marginTop: 2, lineHeight: 17 },

  calendarCard: { marginHorizontal: spacing[5], padding: spacing[4] },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: { fontSize: typography.sizes.lg, fontWeight: '800', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: spacing[2] },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 0.86, padding: 2 },
  cellInner: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderColor: 'transparent',
  },
  cellNumber: { fontSize: typography.sizes.md, fontWeight: '700' },
  cellDot: { width: 5, height: 5, borderRadius: 3 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  todayButton: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  todayLink: { fontSize: typography.sizes.sm, fontWeight: '800' },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  dayTitle: { fontSize: typography.sizes.xl, fontWeight: '800', textTransform: 'capitalize' },
  statRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
  },
  statChip: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: typography.sizes.xl, fontWeight: '800' },
  statLabel: { fontSize: typography.sizes.xs, fontWeight: '700' },

  timelineSection: { paddingHorizontal: spacing[5], paddingTop: spacing[3], gap: spacing[3] },
  timelineRow: { flexDirection: 'row', gap: spacing[3] },
  timelineRail: { width: 22, alignItems: 'center' },
  timelineNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  timelineLine: { flex: 1, width: 2, marginTop: 2, borderRadius: 1 },
  timelineCard: { flex: 1, padding: spacing[3.5] },
  timelineTime: { fontSize: typography.sizes.sm, fontWeight: '800', marginBottom: 2 },
  timelineTitle: { fontSize: typography.sizes.md, fontWeight: '700', lineHeight: 21 },
  timelineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2], flexWrap: 'wrap' },
  metaTag: { borderRadius: radius.full, paddingHorizontal: spacing[2.5], paddingVertical: 3 },
  metaTagText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  timelineMeta: { fontSize: typography.sizes.xs, fontWeight: '600' },
});
