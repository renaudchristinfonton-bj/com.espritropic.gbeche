/**
 * GBECHE — BarChart + LineChart
 * Graphes à barres et courbe pour l'évolution du solde.
 * SVG pur, Reanimated pour les animations d'entrée.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Path, Line, Text as SvgText, Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── Types ────────────────────────────────────────────────

export interface ChartPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data:       ChartPoint[];
  height?:    number;
  barColor?:  string;
  animated?:  boolean;
  showValues?: boolean;
  formatValue?: (v: number) => string;
}

interface LineChartProps {
  data:         ChartPoint[];
  height?:      number;
  color?:       string;
  animated?:    boolean;
  showDots?:    boolean;
  showArea?:    boolean;
  formatValue?: (v: number) => string;
}

// ─── BarChart ─────────────────────────────────────────────

function AnimatedBar({
  x, y, width, height, color, progress,
}: {
  x: number; y: number; width: number; height: number;
  color: string; progress: Animated.SharedValue<number>;
}) {
  const animProps = useAnimatedProps(() => ({
    y:      y + height * (1 - progress.value),
    height: height * progress.value,
  }));

  return (
    <AnimatedRect
      animatedProps={animProps}
      x={x}
      width={width}
      fill={color}
      rx={4}
    />
  );
}

export function BarChart({
  data,
  height      = 160,
  barColor    = '#00E5FF',
  animated    = true,
  showValues  = true,
  formatValue = (v) => String(v),
}: BarChartProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: animated ? 700 : 0,
      easing:   Easing.out(Easing.cubic),
    });
  }, [data]);

  const PADDING  = { top: 24, bottom: 28, left: 8, right: 8 };
  const chartH   = height - PADDING.top - PADDING.bottom;

  const max = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  const BAR_GAP  = 6;

  return (
    <View style={{ width: '100%' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${data.length * 48} ${height}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <SvgGrad id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%"   stopColor={barColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={barColor} stopOpacity={0.4} />
          </SvgGrad>
        </Defs>

        {data.map((d, i) => {
          const barWidth  = 48 - BAR_GAP * 2;
          const x         = i * 48 + BAR_GAP;
          const barHeight = (d.value / max) * chartH;
          const y         = PADDING.top + (chartH - barHeight);
          const fillColor = d.color ?? 'url(#barGrad)';

          return (
            <React.Fragment key={i}>
              <AnimatedBar
                x={x} y={y} width={barWidth}
                height={barHeight}
                color={fillColor}
                progress={progress}
              />
              {/* X label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fontWeight="600"
                fill={colors.textMuted ?? '#888'}
              >
                {d.label}
              </SvgText>
              {/* Value on top */}
              {showValues && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="700"
                  fill={d.color ?? barColor}
                >
                  {formatValue(d.value)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── LineChart ────────────────────────────────────────────

function buildLinePath(
  points: Array<{ x: number; y: number }>,
  smooth = false,
): string {
  if (points.length === 0) return '';
  if (!smooth) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  // Cubic bezier smooth
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx  = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function buildAreaPath(
  linePath: string,
  points: Array<{ x: number; y: number }>,
  bottomY: number,
): string {
  if (points.length === 0) return '';
  const lastX = points[points.length - 1].x;
  const firstX = points[0].x;
  return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
}

export function LineChart({
  data,
  height      = 160,
  color       = '#A78BFA',
  animated    = true,
  showDots    = true,
  showArea    = true,
  formatValue = (v) => String(v),
}: LineChartProps) {
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

  const PADDING = { top: 24, bottom: 28, left: 8, right: 8 };
  const W       = data.length > 1 ? data.length * 60 : 300;
  const chartH  = height - PADDING.top - PADDING.bottom;
  const max     = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const min     = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
  const range   = max - min || 1;

  const points = useMemo(() =>
    data.map((d, i) => ({
      x: PADDING.left + (i / (data.length - 1 || 1)) * (W - PADDING.left - PADDING.right),
      y: PADDING.top + ((max - d.value) / range) * chartH,
    })), [data, W, chartH, max, range]);

  const linePath = useMemo(() => buildLinePath(points, true), [points]);
  const areaPath = useMemo(() => buildAreaPath(linePath, points, PADDING.top + chartH), [linePath, points, chartH]);

  // Animated stroke-dasharray trick for drawing animation
  // We approximate total path length
  const pathLen = useMemo(() => {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len || 1;
  }, [points]);

  const lineAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLen * (1 - progress.value),
  }));

  return (
    <View style={{ width: '100%' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <SvgGrad id="lineArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%"   stopColor={color} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgGrad>
        </Defs>

        {/* Area */}
        {showArea && (
          <Path d={areaPath} fill="url(#lineArea)" />
        )}

        {/* Line */}
        <AnimatedPath
          animatedProps={lineAnimProps}
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLen}
        />

        {/* Dots + labels */}
        {points.map((pt, i) => (
          <React.Fragment key={i}>
            {showDots && (
              <Circle cx={pt.x} cy={pt.y} r={4} fill={color} stroke="#000" strokeWidth={1} />
            )}
            <SvgText
              x={pt.x}
              y={height - 6}
              textAnchor="middle"
              fontSize={9}
              fontWeight="600"
              fill={colors.textMuted ?? '#888'}
            >
              {data[i].label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
