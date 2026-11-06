/**
 * GBECHE — Carte « Objectif de la semaine ».
 *
 * Affiche l'objectif calibré sur l'historique réel, la progression de la
 * semaine en cours vers cet objectif, et la courbe des scores récents.
 * L'origine de l'objectif est toujours visible : amorce ou calibrage.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/src/theme/ThemeContext';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { BarChart, type ChartPoint } from '@/src/components/charts/BarChart';
import { radius, spacing, typography } from '@/src/theme';
import type { WeeklyTarget } from '@/src/domain/reviewSeries';

interface WeeklyTargetCardProps {
  target: WeeklyTarget;
  points: ChartPoint[];
  animated?: boolean;
}

export function WeeklyTargetCard({ target, points, animated = true }: WeeklyTargetCardProps) {
  const { colors } = useTheme().theme;
  const reached = target.reached;
  const accent = reached ? colors.success : target.gap >= -10 ? colors.warning : colors.danger;
  const progress = target.target > 0 ? Math.min(1, target.current / target.target) : 0;

  return (
    <GlassCard elevated noPadding blur="light" style={styles.card}>
      <LinearGradient
        colors={[`${accent}22`, 'rgba(99,102,241,0.04)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.icon, { backgroundColor: `${accent}1A` }]}>
            <Ionicons name={reached ? 'checkmark-done' : 'flag'} size={16} color={accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Objectif de la semaine</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${accent}1A`, borderColor: accent }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {target.mode === 'start' ? 'AMORCE' : reached ? 'TENU' : 'EN COURS'}
          </Text>
        </View>
      </View>

      <View
        style={styles.numbers}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Score de la semaine : ${Math.round(target.current)} sur un objectif de ${Math.round(target.target)} sur 100.`}
      >
        <Text
          style={[styles.current, { color: accent }]}
          accessibilityLabel={`Score actuel ${target.current} sur un objectif de ${target.target}`}
        >
          {target.current}
        </Text>
        <Text style={[styles.slash, { color: colors.textTertiary }]}>/</Text>
        <Text style={[styles.target, { color: colors.textMuted }]}>{target.target}</Text>
      </View>

      <View style={styles.bar}>
        <ProgressBar progress={progress} color={accent} height={7} />
      </View>

      <Text style={[styles.message, { color: colors.textMuted }]}>{target.message}</Text>

      {points.length > 1 ? (
        <View style={styles.chart}>
          <BarChart
            data={points}
            height={120}
            barColor={colors.primary}
            showValues
            animated={animated}
            formatValue={(value) => String(value)}
          />
          <Text style={[styles.chartCaption, { color: colors.textTertiary }]}>
            Score des {points.length} dernières semaines
          </Text>
        </View>
      ) : (
        <Text style={[styles.chartCaption, { color: colors.textTertiary }]}>
          La courbe apparaîtra dès ta deuxième semaine.
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', padding: spacing[5], gap: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  icon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.sizes.base, fontWeight: '800' },
  badge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing[2.5], paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  numbers: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  current: { fontSize: typography.sizes['5xl'], fontWeight: '900', letterSpacing: -2 },
  slash: { fontSize: typography.sizes.xl, fontWeight: '700' },
  target: { fontSize: typography.sizes.xl, fontWeight: '900' },
  bar: { marginTop: -4 },
  message: { fontSize: typography.sizes.sm, fontWeight: '600', lineHeight: 19 },
  chart: { marginTop: spacing[2] },
  chartCaption: { fontSize: typography.sizes.xs, fontWeight: '600', textAlign: 'center', marginTop: 2 },
});
