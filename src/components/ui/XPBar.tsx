/**
 * GBECHE — XPBar + ProgressRing
 * Composants de progression thémés avec animations.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/src/theme/ThemeContext';

// ─── XP Bar linéaire ──────────────────────────────────────

interface XPBarProps {
  progress:  number;       // 0-1
  height?:   number;
  color?:    [string, string]; // gradient [from, to]
  style?:    StyleProp<ViewStyle>;
  animated?: boolean;
}

export function XPBar({
  progress,
  height   = 8,
  color    = ['#A78BFA', '#00E5FF'],
  style,
  animated = true,
}: XPBarProps) {
  const { theme }  = useTheme();
  const { colors } = theme;
  const width      = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(Math.max(progress, 0), 1) * 100;
    if (animated) {
      width.value = withTiming(target, {
        duration: 800,
        easing:   Easing.out(Easing.cubic),
      });
    } else {
      width.value = target;
    }
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={[
      styles.xpBarBg,
      { height, backgroundColor: colors.glass, borderRadius: height / 2 },
      style,
    ]}>
      <Animated.View style={[
        styles.xpBarFill,
        barStyle,
        {
          height,
          borderRadius: height / 2,
          // Gradient via background — en production utiliser LinearGradient
          backgroundColor: color[1],
        },
      ]} />
    </View>
  );
}

// ─── Progress Ring (SVG) ──────────────────────────────────

interface ProgressRingProps {
  size:        number;
  progress:    number;   // 0-1
  strokeWidth?: number;
  label?:      string;   // Texte au centre
  sublabel?:   string;
  color?:      string;
  bgColor?:    string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  size,
  progress,
  strokeWidth = 6,
  label,
  sublabel,
  color   = '#00E5FF',
  bgColor,
}: ProgressRingProps) {
  const { theme }  = useTheme();
  const { colors } = theme;

  const r    = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  const cy   = size / 2;

  const offset = useSharedValue(circ);

  useEffect(() => {
    const target = circ * (1 - Math.min(Math.max(progress, 0), 1));
    offset.value = withSpring(target, { damping: 20, stiffness: 80 });
  }, [progress, circ]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A78BFA" />
            <Stop offset="100%" stopColor="#00E5FF" />
          </SvgGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={bgColor ?? colors.glass}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <AnimatedCircle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeLinecap="round"
          animatedProps={animProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {(label || sublabel) && (
        <View style={styles.ringCenter}>
          {label    && <Text style={styles.ringLabel}>{label}</Text>}
          {sublabel && <Text style={styles.ringSublabel}>{sublabel}</Text>}
        </View>
      )}
    </View>
  );
}

// ─── Mini badge XP flottant ────────────────────────────────
interface XPFloatProps {
  amount:  number;
  mult?:   number;
  visible: boolean;
}

export function XPFloat({ amount, mult = 1, visible }: XPFloatProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value      = 1;
      translateY.value   = 0;

      opacity.value    = withTiming(0,  { duration: 900, easing: Easing.in(Easing.quad) });
      translateY.value = withTiming(-60, { duration: 900, easing: Easing.out(Easing.quad) });
    }
  }, [visible, amount]);

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.xpFloat, style]}>
      <Text style={styles.xpFloatText}>
        +{amount} XP{mult > 1 ? ` ×${mult}` : ''}
      </Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  xpBarBg:     { overflow: 'hidden' },
  xpBarFill:   { position: 'absolute', left: 0, top: 0 },
  ringCenter:  { position: 'absolute', alignItems: 'center' },
  ringLabel:   { fontSize: 20, fontWeight: '900', color: '#EEF0FF', letterSpacing: -0.5 },
  ringSublabel:{ fontSize: 9,  fontWeight: '700', color: 'rgba(238,240,255,0.5)', letterSpacing: 0.5 },

  xpFloat: {
    position:        'absolute',
    alignSelf:       'center',
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius:    20,
    paddingHorizontal:12,
    paddingVertical:  5,
    borderWidth:     1,
    borderColor:     'rgba(167,139,250,0.3)',
  },
  xpFloatText: {
    fontSize:    15,
    fontWeight:  '900',
    color:       '#A78BFA',
    letterSpacing:-0.5,
  },
});
