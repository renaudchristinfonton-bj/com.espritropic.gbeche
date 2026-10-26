/**
 * GBECHE — DonutChart
 * Graphe en anneau animé pour la répartition des dépenses.
 * SVG pur avec react-native-svg + Reanimated.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Types ────────────────────────────────────────────────

export interface DonutSlice {
  label:    string;
  value:    number;
  color:    string;
  icon?:    string;
}

interface DonutChartProps {
  data:         DonutSlice[];
  size?:        number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?:   string;
  animated?:    boolean;
  showLegend?:  boolean;
}

// ─── Arc Math ─────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  // Prevent full-circle path (SVG bug)
  const delta = endDeg - startDeg;
  const end   = delta >= 360 ? startDeg + 359.99 : endDeg;

  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, end);
  const large = delta > 180 ? 1 : 0;

  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── Single Animated Slice ────────────────────────────────

function DonutSlicePath({
  cx, cy, r, startDeg, endDeg, color, progress,
}: {
  cx: number; cy: number; r: number;
  startDeg: number; endDeg: number;
  color: string; progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const sweep = (endDeg - startDeg) * progress.value;
    const d = describeArc(cx, cy, r, startDeg, startDeg + sweep);
    return { d };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill="none"
      stroke={color}
      strokeWidth={r * 0.42}
      strokeLinecap="butt"
    />
  );
}

// ─── Main Component ───────────────────────────────────────

export function DonutChart({
  data,
  size         = 200,
  strokeWidth  = 38,
  centerLabel,
  centerSub,
  animated     = true,
  showLegend   = true,
}: DonutChartProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: animated ? 900 : 0,
      easing:   Easing.out(Easing.cubic),
    });
  }, [data]);

  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - strokeWidth) / 2;

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const slices = useMemo(() => {
    let cursor = 0;
    return data.map((slice) => {
      const sweep     = (slice.value / total) * 360;
      const startDeg  = cursor;
      const endDeg    = cursor + sweep;
      cursor += sweep;
      return { ...slice, startDeg, endDeg };
    });
  }, [data, total]);

  return (
    <View style={styles.container}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={colors.glass}
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice, i) => (
            <DonutSlicePath
              key={i}
              cx={cx} cy={cy} r={r}
              startDeg={slice.startDeg}
              endDeg={slice.endDeg}
              color={slice.color}
              progress={progress}
            />
          ))}
        </Svg>

        {/* Center label */}
        {(centerLabel || centerSub) && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            {centerLabel && (
              <Text style={[styles.centerLabel, { color: colors.text }]}>
                {centerLabel}
              </Text>
            )}
            {centerSub && (
              <Text style={[styles.centerSub, { color: colors.textMuted }]}>
                {centerSub}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          {slices.map((slice, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: slice.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>
                {slice.label}
              </Text>
              <Text style={[styles.legendValue, { color: colors.text }]}>
                {Math.round((slice.value / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  center: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize:     20,
    fontWeight:   '900',
    letterSpacing:-0.5,
  },
  centerSub: {
    fontSize:   10,
    fontWeight: '600',
    marginTop:  2,
    letterSpacing: 0.5,
  },
  legend: {
    marginTop: 16,
    width:     '100%',
    gap:        6,
  },
  legendRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             8,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  legendLabel: {
    flex:       1,
    fontSize:   12,
    fontWeight: '500',
  },
  legendValue: {
    fontSize:   12,
    fontWeight: '800',
  },
});
