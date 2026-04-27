/**
 * GBECHE — RadarChart
 * Graphe radar / toile d'araignée pour l'équilibre de vie.
 * 6 axes : Finance, Santé, Carrière, Spirituel, Famille, Éducation
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

// ─── Types ────────────────────────────────────────────────

export interface RadarAxis {
  label: string;
  value: number;  // 0-100
  color: string;
  icon?: string;
}

interface RadarChartProps {
  axes:       RadarAxis[];
  size?:      number;
  levels?:    number;   // Concentric grid rings
  animated?:  boolean;
}

// ─── Math helpers ─────────────────────────────────────────

function toPoint(cx: number, cy: number, r: number, index: number, total: number) {
  const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function toPoints(cx: number, cy: number, r: number, values: number[], total: number): string {
  return values
    .map((v, i) => {
      const pt = toPoint(cx, cy, r * (v / 100), i, total);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');
}

// ─── Component ────────────────────────────────────────────

export function RadarChart({
  axes,
  size      = 220,
  levels    = 4,
  animated  = true,
}: RadarChartProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 32; // margin for labels

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: animated ? 1000 : 0,
      easing:   Easing.out(Easing.cubic),
    });
  }, [axes]);

  const n = axes.length;

  // Grid rings (background)
  const gridRings = useMemo(() =>
    Array.from({ length: levels }, (_, i) => {
      const r = maxR * ((i + 1) / levels);
      const pts = Array.from({ length: n }, (_, j) => toPoint(cx, cy, r, j, n));
      return pts.map(p => `${p.x},${p.y}`).join(' ');
    }), [n, levels, maxR, cx, cy]);

  // Axis lines (spokes)
  const spokes = useMemo(() =>
    Array.from({ length: n }, (_, i) => toPoint(cx, cy, maxR, i, n)),
    [n, maxR, cx, cy]);

  // Data polygon points (animated)
  const animatedPoints = useDerivedValue(() => {
    const scaled = axes.map(a => a.value * progress.value);
    return toPoints(cx, cy, maxR, scaled, n);
  });

  const polygonProps = useAnimatedProps(() => ({
    points: animatedPoints.value,
  }));

  // Label positions (outside maxR)
  const labelRadius = maxR + 22;
  const labels = useMemo(() =>
    Array.from({ length: n }, (_, i) => {
      const pt = toPoint(cx, cy, labelRadius, i, n);
      return { ...pt, label: axes[i].label, color: axes[i].color, value: axes[i].value };
    }), [n, labelRadius, cx, cy, axes]);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <Polygon
            key={`ring-${i}`}
            points={pts}
            fill="none"
            stroke={colors.glassBorder ?? 'rgba(255,255,255,0.08)'}
            strokeWidth={1}
          />
        ))}

        {/* Spoke lines */}
        {spokes.map((pt, i) => (
          <Line
            key={`spoke-${i}`}
            x1={cx} y1={cy} x2={pt.x} y2={pt.y}
            stroke={colors.glassBorder ?? 'rgba(255,255,255,0.08)'}
            strokeWidth={1}
          />
        ))}

        {/* Data fill */}
        <AnimatedPolygon
          animatedProps={polygonProps}
          fill="rgba(0,229,255,0.12)"
          stroke="#00E5FF"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {axes.map((axis, i) => {
          const r = maxR * (axis.value / 100);
          const pt = toPoint(cx, cy, r, i, n);
          return (
            <Circle
              key={`dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill={axis.color}
              stroke="#000"
              strokeWidth={1}
            />
          );
        })}

        {/* Labels */}
        {labels.map((lbl, i) => (
          <SvgText
            key={`lbl-${i}`}
            x={lbl.x}
            y={lbl.y + 4}
            textAnchor="middle"
            fontSize={9}
            fontWeight="700"
            fill={lbl.color}
            letterSpacing={0.5}
          >
            {lbl.label.toUpperCase()}
          </SvgText>
        ))}
      </Svg>

      {/* Score badges */}
      <View style={styles.scoreRow}>
        {axes.map((axis, i) => (
          <View key={i} style={styles.scoreItem}>
            <View style={[styles.scoreDot, { backgroundColor: axis.color }]} />
            <Text style={[styles.scoreVal, { color: colors.text }]}>
              {axis.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  scoreRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            8,
    marginTop:      8,
    justifyContent: 'center',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  scoreDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  scoreVal: {
    fontSize:   11,
    fontWeight: '700',
  },
});
