/**
 * GBECHE — Conteneur d'écran standard.
 * Applique le fond, les safe areas et le défilement éventuel.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeContext';
import { SCREEN_BOTTOM_PADDING } from '../../theme/layout';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  /**
   * Marge basse du contenu défilant. Par défaut elle réserve la place de
   * la barre d'onglets flottante afin que rien ne reste masqué dessous.
   * Les écrans plein écran (sans barre) peuvent passer une valeur réduite.
   */
  bottomPadding?: number;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentContainerStyle,
  bottomPadding = SCREEN_BOTTOM_PADDING,
}: ScreenProps) {
  const { theme } = useTheme();
  const { colors, spacing } = theme;

  const padding = padded ? spacing[5] : 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }, style]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[{ padding, paddingBottom: bottomPadding }, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, { padding }, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
