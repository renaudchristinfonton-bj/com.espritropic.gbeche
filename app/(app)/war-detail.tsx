/** GBECHE — Détail d'une guerre et historique hebdomadaire. */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { WarPerformanceStrip } from '@/src/components/war/WarPerformanceStrip';
import { BarChart } from '@/src/components/charts/BarChart';
import { useRepoQuery } from '@/src/db/useRepoQuery';
import { getWar } from '@/src/db/repositories/wars.repo';
import { listInstancesInRange } from '@/src/db/repositories/adversaries.repo';
import { warPerformance } from '@/src/domain/review';
import { warWeeklyHistory } from '@/src/domain/warHistory';
import { DAY_MS } from '@/src/utils/dayKey';
import { useTheme } from '@/src/theme/ThemeContext';
import { radius, spacing, typography } from '@/src/theme';

const EMPTY_INSTANCES: Awaited<ReturnType<typeof listInstancesInRange>> = [];

const PERIODS = [
  { label: '12 sem.', value: '12' },
  { label: '26 sem.', value: '26' },
  { label: '52 sem.', value: '52' },
];

export default function WarDetailScreen() {
  const { colors } = useTheme().theme;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [weeks, setWeeks] = useState(12);
  const now = Date.now();
  const query = useRepoQuery(async () => {
    if (!id) return { war: null, instances: [] as Awaited<ReturnType<typeof listInstancesInRange>> };
    const from = now - weeks * 7 * DAY_MS;
    const [war, instances] = await Promise.all([getWar(id), listInstancesInRange(from, now)]);
    return { war, instances: instances.filter((row) => row.war_id === id) };
  }, [id, weeks]);
  const war = query.data?.war ?? null;
  const instances = query.data?.instances ?? EMPTY_INSTANCES;
  const history = useMemo(
    () => (war ? warWeeklyHistory(instances, war, now, weeks) : []),
    [instances, war, now, weeks],
  );
  const performance = useMemo(
    () => (war ? warPerformance(instances, war, now, 30) : null),
    [instances, war, now],
  );
  const chart = useMemo(
    () => history.filter((week) => week.completionRate !== null).map((week) => ({
      label: week.label === 'Cette sem.' ? 'Act.' : week.label,
      value: Math.round((week.completionRate ?? 0) * 100),
      color: (week.completionRate ?? 0) >= 0.8 ? colors.success : (week.completionRate ?? 0) >= 0.5 ? colors.warning : colors.danger,
    })),
    [history, colors],
  );

  if (!war) {
    return (
      <Screen scroll padded>
        <ScreenHeader
          title="Détail de la guerre"
          subtitle={query.status === 'loading' ? 'Chargement…' : 'Cette guerre est introuvable.'}
          left={<BackButton onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const totalWins = history.reduce((sum, week) => sum + week.wins, 0);
  const totalLosses = history.reduce((sum, week) => sum + week.losses, 0);
  const totalXp = history.reduce((sum, week) => sum + week.xp, 0);

  return (
    <Screen scroll padded>
      <ScreenHeader
        eyebrow="DOSSIER DE GUERRE"
        title={war.title}
        subtitle="Historique réel, semaine par semaine"
        left={<BackButton onPress={() => router.back()} />}
      />

      {performance ? <WarPerformanceStrip performance={performance} color={war.color} /> : null}

      <GlassCard style={styles.summary}>
        <Metric label="Victoires" value={String(totalWins)} color={colors.success} />
        <Metric label="Défaites" value={String(totalLosses)} color={colors.danger} />
        <Metric label="XP gagnée" value={`+${totalXp}`} color={colors.xp} />
      </GlassCard>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique hebdomadaire</Text>
      </View>
      <SegmentedControl
        segments={PERIODS}
        value={String(weeks)}
        onChange={(value) => setWeeks(Number(value))}
      />

      <GlassCard style={styles.chartCard}>
        <Text style={[styles.caption, { color: colors.textMuted }]}>Taux de réussite · % par semaine</Text>
        {chart.length > 0 ? (
          <BarChart data={chart} height={190} barColor={war.color} animated={false} formatValue={(v) => `${v}%`} />
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="analytics-outline" size={22} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune mission terminée sur cette période.</Text>
          </View>
        )}
        <Text style={[styles.chartNote, { color: colors.textTertiary }]}>Les semaines sans mission tranchée restent dans la liste, sans taux inventé.</Text>
      </GlassCard>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Détail semaine par semaine</Text>
        <Text style={[styles.caption, { color: colors.textMuted }]}>{weeks} semaines</Text>
      </View>
      {[...history].reverse().map((week) => (
        <View key={week.label} style={[styles.weekRow, { borderBottomColor: colors.glassBorder }]}>
          <View style={[styles.weekMark, { backgroundColor: week.completionRate === null ? colors.glassBorder : week.completionRate >= 0.8 ? colors.success : week.completionRate >= 0.5 ? colors.warning : colors.danger }]} />
          <View style={styles.weekMain}>
            <Text style={[styles.weekTitle, { color: colors.text }]}>{week.label}</Text>
            <Text style={[styles.weekMeta, { color: colors.textMuted }]}>
              {week.wins} V · {week.losses} D{week.pending ? ` · ${week.pending} en attente` : ''} · +{week.xp} XP
            </Text>
          </View>
          <Text style={[styles.weekRate, { color: colors.text }]}>
            {week.completionRate === null ? '—' : `${Math.round(week.completionRate * 100)} %`}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme().theme;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Retour aux guerres" onPress={onPress} hitSlop={10} style={[styles.backButton, { borderColor: colors.glassBorder }]}>
      <Ionicons name="arrow-back" size={19} color={colors.text} />
    </Pressable>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme().theme;
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { width: 38, height: 38, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing[4] },
  metric: { alignItems: 'center', gap: 3 },
  metricValue: { fontSize: typography.sizes.xl, fontWeight: '900' },
  metricLabel: { fontSize: typography.sizes.xs, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing[4], marginBottom: spacing[2] },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: '800' },
  caption: { fontSize: typography.sizes.xs, fontWeight: '600' },
  chartCard: { gap: spacing[2], paddingTop: spacing[3] },
  chartNote: { fontSize: typography.sizes.xs, lineHeight: 17 },
  emptyChart: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  emptyText: { fontSize: typography.sizes.sm, textAlign: 'center' },
  weekRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  weekMark: { width: 4, height: 34, borderRadius: 2 },
  weekMain: { flex: 1, gap: 3 },
  weekTitle: { fontSize: typography.sizes.sm, fontWeight: '800' },
  weekMeta: { fontSize: typography.sizes.xs, fontWeight: '600' },
  weekRate: { minWidth: 50, textAlign: 'right', fontSize: typography.sizes.md, fontWeight: '900' },
});
