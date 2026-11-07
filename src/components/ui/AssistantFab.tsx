/**
 * GBECHE — Bouton assistant flottant global.
 * Positionné au-dessus de la pilule d'onglets, côté gauche : un petit
 * compagnon glass toujours accessible pour ouvrir la conversation.
 * Un halo doux signale sa présence sans gêner la lecture.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';
import { FLOATING_TAB_BAR_HEIGHT } from '../../theme/layout';
import * as Haptics from '../../services/haptics';

const HIDDEN_ROUTES = ['/agent', '/data'];

export function AssistantFab() {
  const { colors, isDark } = useTheme().theme;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 1600 }), -1, false),
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null;

  const open = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(app)/agent');
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { bottom: insets.bottom + 8 + FLOATING_TAB_BAR_HEIGHT + spacing[3] },
      ]}
    >
      <View style={styles.wrap}>
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { backgroundColor: colors.primary }, haloStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir l'assistant de conversation"
          onPress={open}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}
        >
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={72}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.glassTint, { backgroundColor: colors.primaryDim }]} />
          <Ionicons name="sparkles" size={20} color={colors.primary} />
          <Text style={[styles.label, { color: colors.text }]}>Assistant</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    zIndex: 40,
  },
  wrap: {
    width: 116,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: radius.full,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
  },
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
});
