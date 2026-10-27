/**
 * GBECHE — Barre de progression thématée.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0..1
  color?: string;
  height?: number;
  trackColor?: string;
}

export function ProgressBar({
  progress,
  color,
  height = 8,
  trackColor,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor ?? colors.glass,
          borderRadius: radius.full,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: color ?? colors.primary,
            borderRadius: radius.full,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
