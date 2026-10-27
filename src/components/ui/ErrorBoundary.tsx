/**
 * GBECHE — Frontière d'erreurs globale.
 * Capture toute exception de rendu pour afficher un écran de reprise
 * plutôt qu'un crash blanc/fermeture. Aucune donnée n'est touchée :
 * l'utilisateur peut réessayer ou revenir au quartier général.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

interface ErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Écran de reprise utilisé par expo-router (reçu en props). */
export function RouteErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const { colors } = useTheme().theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerDim }]}>
        <Ionicons name="shield-half-outline" size={44} color={colors.danger} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Mission perturbée</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Une erreur inattendue est survenue, mais tes données sont intactes. Tu peux réessayer
        ou rejoindre le quartier général.
      </Text>
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
        <Text style={[styles.detail, { color: colors.textTertiary }]} numberOfLines={12}>
          {error?.message ?? 'Erreur inconnue'}
        </Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={[styles.primary, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="refresh" size={18} color={colors.textInverse} />
          <Text style={[styles.primaryLabel, { color: colors.textInverse }]}>Réessayer</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(app)/home')}
          style={[styles.secondary, { borderColor: colors.glassBorder }]}
        >
          <Ionicons name="home-outline" size={18} color={colors.primary} />
          <Text style={[styles.secondaryLabel, { color: colors.primary }]}>Quartier général</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Boundaire réutilisable pour isoler une zone d'écran. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // On journalise sans interrompre ; aucun outil tiers n'est appelé.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = (): void => this.setState({ hasError: false, error: null });

  render(): React.ReactNode {
    if (!this.state.hasError || !this.state.error) return this.props.children;
    return <RouteErrorFallback error={this.state.error} retry={this.reset} />;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing[6], gap: spacing[4] },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { fontSize: typography.sizes['2xl'], fontWeight: '800', textAlign: 'center' },
  body: { fontSize: typography.sizes.md, lineHeight: 23, textAlign: 'center' },
  detailScroll: { maxHeight: 120 },
  detailContent: {
    borderRadius: radius.md,
    padding: spacing[3],
  },
  detail: { fontSize: typography.sizes.xs, fontFamily: 'monospace' },
  actions: { gap: spacing[3], marginTop: spacing[2] },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: radius.lg,
  },
  primaryLabel: { fontSize: typography.sizes.md, fontWeight: '800' },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  secondaryLabel: { fontSize: typography.sizes.md, fontWeight: '700' },
});
