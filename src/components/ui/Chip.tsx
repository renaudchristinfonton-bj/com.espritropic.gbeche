/**
 * GBECHE — Pastille sélectionnable (filtres, choix multiples).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export function Chip({ label, selected, onPress, icon, color }: ChipProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const accent = color ?? colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? `${accent}1F` : colors.glass,
          borderColor: selected ? accent : colors.glassBorder,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={selected ? accent : colors.textMuted}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          { color: selected ? accent : colors.textMuted, fontWeight: selected ? '800' : '600' },
        ]}
      >
        {label}
      </Text>
      {selected ? (
        <View style={{ marginLeft: 6 }}>
          <Ionicons name="checkmark-circle" size={15} color={accent} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  label: {
    fontSize: typography.sizes.base,
  },
});
