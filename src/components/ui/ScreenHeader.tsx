/**
 * GBECHE — En-tête d'écran partagé.
 * Garantit une hiérarchie visuelle identique et professionnelle sur
 * tous les écrans : titre fort, sous-titre discret, zone d'action à droite.
 */
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Contenu optionnel à droite (pastilles, bouton d'action). */
  right?: ReactNode;
  /** Contenu optionnel à gauche (ex. bouton retour sur un écran plein écran). */
  left?: ReactNode;
  /** Petit texte au-dessus du titre (ex. nom de section). */
  eyebrow?: string;
}

export function ScreenHeader({ title, subtitle, right, left, eyebrow }: ScreenHeaderProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <View style={styles.texts}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
          ) : null}
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  texts: { flex: 1, gap: 4 },
  left: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 2,
  },
});
