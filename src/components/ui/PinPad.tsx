/**
 * GBECHE — Clavier PIN 4 chiffres partagé (onboarding + verrouillage).
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from '@/src/services/haptics';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  onFull?: (pin: string) => void;
  error?: boolean;
  biometric?: () => void;
  biometricIcon?: keyof typeof Ionicons.glyphMap;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function PinPad({ value, onChange, onFull, error, biometric, biometricIcon }: PinPadProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const press = (digit: string) => {
    if (value.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = value + digit;
    onChange(next);
    if (next.length === 4) onFull?.(next);
  };

  const remove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dots, animatedStyle]}>
        {[0, 1, 2, 3].map((index) => {
          const filled = index < value.length;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor: error ? colors.danger : colors.primary,
                  backgroundColor: filled ? (error ? colors.danger : colors.primary) : 'transparent',
                },
              ]}
            />
          );
        })}
      </Animated.View>

      <View style={styles.grid}>
        {DIGITS.map((digit: string) => (
          <Pressable
            key={digit}
            onPress={() => press(digit)}
            style={[styles.key, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>{digit}</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={biometric}
          disabled={!biometric}
          style={[styles.key, styles.sideKey, !biometric && styles.hidden]}
        >
          {biometric && biometricIcon ? (
            <Ionicons name={biometricIcon} size={26} color={colors.primary} />
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => press('0')}
          style={[styles.key, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
        >
          <Text style={[styles.keyText, { color: colors.text }]}>0</Text>
        </Pressable>

        <Pressable onPress={remove} style={[styles.key, styles.sideKey]}>
          <Ionicons name="backspace-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing[8] },
  dots: { flexDirection: 'row', gap: spacing[5] },
  dot: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    gap: spacing[4],
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideKey: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  hidden: { opacity: 0 },
  keyText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
  },
});
