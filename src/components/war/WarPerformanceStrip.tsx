/**
 * GBECHE — Performance d'une guerre sur les 30 derniers jours.
 *
 * Affiche le taux de réussite réel, le volume de missions et l'évolution
 * par rapport aux 30 jours précédents. Quand il n'y a rien à comparer,
 * on le dit au lieu d'afficher un pourcentage trompeur.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/theme/ThemeContext';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { radius, spacing, typography } from '@/src/theme';
import type { WarPerformance } from '@/src/domain/review';

interface WarPerformanceStripProps {
  performance: WarPerformance;
  color: string;
  days?: number;
}

const percent = (ratio: number): string => `${Math.round(ratio * 100)} %`;

export function WarPerformanceStrip({ performance, color, days = 30 }: WarPerformanceStripProps) {
  const { colors } = useTheme().theme;
  const { current, previous, rateDelta, winsDelta } = performance;

  // Aucune mission du tout sur la période : message d'amorçage, pas de zéro.
  if (!current || current.total === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
        <Ionicons name="analytics-outline" size={15} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Aucune mission planifiée sur les {days} derniers jours.
        </Text>
      </View>
    );
  }

  const decided = current.wins + current.losses;
  const rate = current.completionRate;
  const tone =
    rate === null ? colors.textTertiary : rate >= 0.8 ? colors.success : rate >= 0.5 ? colors.warning : colors.danger;

  const trend = (() => {
    if (rateDelta === null) return { icon: 'ellipse-outline' as const, label: 'Pas de comparatif', tone: colors.textTertiary };
    if (Math.abs(rateDelta) < 0.005) return { icon: 'remove' as const, label: 'Stable', tone: colors.textMuted };
    const up = rateDelta > 0;
    return {
      icon: up ? ('trending-up' as const) : ('trending-down' as const),
      label: `${up ? '+' : '−'}${Math.abs(Math.round(rateDelta * 100))} pts`,
      tone: up ? colors.success : colors.warning,
    };
  })();

  const label =
    rate === null
      ? `Sur ${days} jours : aucune mission tranchée (${current.pending} en attente).`
      : `Sur ${days} jours : ${percent(rate)} de réussite, ${current.wins} victoire${current.wins > 1 ? 's' : ''}, ${current.losses} défaite${current.losses > 1 ? 's' : ''}` +
        `${current.pending > 0 ? `, ${current.pending} en attente` : ''}.`;

  return (
    <View
      accessible
      accessibilityLabel={`${label} ${trend.label}. ${current.xp} XP gagnée${current.xp > 1 ? 's' : ''}.`}
      style={[styles.container, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.textMuted }]}>{days} derniers jours</Text>
        <View style={styles.trend}>
          <Ionicons name={trend.icon} size={13} color={trend.tone} />
          <Text style={[styles.trendText, { color: trend.tone }]}>{trend.label}</Text>
        </View>
      </View>

      <View style={styles.numbers}>
        <Text style={[styles.rate, { color: tone }]}>{rate === null ? '—' : percent(rate)}</Text>
        <View style={styles.right}>
          <Text style={[styles.detail, { color: colors.text }]}>
            {current.wins} V · {current.losses} D
            {current.pending > 0 ? ` · ${current.pending} ⏳` : ''}
          </Text>
          <Text style={[styles.detail, { color: colors.textMuted }]}>
            {current.xp > 0 ? `+${current.xp} XP` : '0 XP'}
            {decided > 0 ? ` sur ${decided} mission${decided > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </View>

      <ProgressBar progress={rate ?? 0} color={tone} height={5} />

      {rate === null ? (
        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Aucune mission tranchée pour l’instant : termine-en une pour voir ton taux.
        </Text>
      ) : winsDelta !== null && winsDelta !== 0 ? (
        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          {winsDelta > 0
            ? `${winsDelta} victoire${winsDelta > 1 ? 's' : ''} de plus que la période précédente.`
            : `${Math.abs(winsDelta)} victoire${Math.abs(winsDelta) > 1 ? 's' : ''} de moins que la période précédente.`}
        </Text>
      ) : previous ? (
        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          Même nombre de victoires que la période précédente.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3.5],
    gap: spacing[2],
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.sizes.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: typography.sizes.xs, fontWeight: '800' },
  numbers: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rate: { fontSize: typography.sizes['3xl'], fontWeight: '900', letterSpacing: -1 },
  right: { flex: 1, gap: 1 },
  detail: { fontSize: typography.sizes.xs, fontWeight: '700' },
  footnote: { fontSize: typography.sizes.xs, fontWeight: '600' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
  },
  emptyText: { flex: 1, fontSize: typography.sizes.xs, fontWeight: '600' },
});
