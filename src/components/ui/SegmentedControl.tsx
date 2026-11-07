/**
 * GBECHE — Contrôle segmenté (onglets plats).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from '@/src/services/haptics';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder },
      ]}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(segment.value);
            }}
            style={[
              styles.segment,
              active && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.textInverse : colors.textMuted },
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
