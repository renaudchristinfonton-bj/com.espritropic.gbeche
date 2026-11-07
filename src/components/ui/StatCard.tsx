/**
 * GBECHE — Carte de statistique du tableau de bord.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  hint?: string;
}

export function StatCard({ icon, label, value, accent, hint }: StatCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <GlassCard style={styles.card} animated={false}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.value, { color: colors.text }]}
      >
        {value}
      </Text>
      <Text numberOfLines={1} style={[styles.label, { color: colors.textMuted }]}>
        {label}
      </Text>
      {hint ? (
        <Text numberOfLines={1} style={[styles.hint, { color: accent }]}>
          {hint}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    gap: spacing[2],
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  hint: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
});
