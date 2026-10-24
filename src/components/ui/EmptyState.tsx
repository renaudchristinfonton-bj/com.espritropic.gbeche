/**
 * GBECHE — État vide normalisé (jamais d'écran muet).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  color,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const accent = color ?? colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}16`, borderColor: `${accent}33` }]}>
        <Ionicons name={icon} size={36} color={accent} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="glass" size="sm" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[6],
    gap: spacing[3],
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
});
