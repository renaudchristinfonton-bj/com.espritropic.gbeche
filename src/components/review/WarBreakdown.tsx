/**
 * GBECHE — Répartition des missions par guerre.
 *
 * Une ligne par guerre réellement sollicitée sur la période : nom, taux de
 * réussite, part des victoires et XP gagnée. Les guerres sans mission ne
 * sont pas affichées : l'absence d'activité n'est pas un échec.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/theme/ThemeContext';
import { GlassCard } from '@/src/components/ui/GlassCard';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { radius, spacing, typography } from '@/src/theme';
import type { ReviewWarLine } from '@/src/domain/review';

interface WarBreakdownProps {
  lines: ReviewWarLine[];
  emptyLabel?: string;
}

const percent = (ratio: number): string => `${Math.round(ratio * 100)} %`;

export function WarBreakdown({ lines, emptyLabel = 'Aucune mission planifiée sur la période.' }: WarBreakdownProps) {
  const { colors } = useTheme().theme;
  const visible = lines.filter((line) => line.total > 0);

  if (visible.length === 0) {
    return (
      <GlassCard>
        <Text style={[styles.empty, { color: colors.textMuted }]}>{emptyLabel}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ gap: spacing[4] }}>
      {visible.map((line) => {
        const rate = line.completionRate;
        const tone =
          rate === null
            ? colors.textTertiary
            : rate >= 0.8
              ? colors.success
              : rate >= 0.5
                ? colors.warning
                : colors.danger;
        return (
          <View key={line.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={[styles.warIcon, { backgroundColor: `${line.color}1A` }]}>
                <Ionicons name={line.icon as keyof typeof Ionicons.glyphMap} size={15} color={line.color} />
              </View>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
                {line.title}
              </Text>
              <Text style={[styles.rate, { color: tone }]}>
                {rate === null ? '—' : percent(rate)}
              </Text>
            </View>
            <ProgressBar progress={Math.min(1, rate ?? 0)} color={tone} height={5} />
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {line.wins} V · {line.losses} D
                {line.pending > 0 ? ` · ${line.pending} en attente` : ''}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {line.xp > 0 ? `+${line.xp} XP` : '0 XP'}
                {line.wins > 0 ? ` · ${percent(line.share)} des victoires` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: typography.sizes.sm, fontWeight: '600', lineHeight: 20 },
  row: { gap: 6 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] },
  warIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: typography.sizes.base, fontWeight: '800' },
  rate: { fontSize: typography.sizes.sm, fontWeight: '900' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2] },
  meta: { fontSize: typography.sizes.xs, fontWeight: '600' },
});
