/**
 * GBECHE — Button
 * Bouton principal avec variants et retour haptique.
 */

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from '@/src/services/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme/ThemeContext';
import { neon } from '@/src/theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'glass';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  disabled?:  boolean;
  loading?:   boolean;
  fullWidth?:  boolean;
  icon?:      React.ReactNode;
  style?:     StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GRADIENT_COLORS: Record<ButtonVariant, [string, string]> = {
  primary:   [neon.cyan,   '#0099FF'],
  secondary: [neon.orange, '#E05020'],
  ghost:     ['transparent', 'transparent'],
  danger:    [neon.red,    '#CC2030'],
  gold:      [neon.gold,   '#FFA500'],
  glass:     ['transparent', 'transparent'],
};

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary:   '#000000',
  secondary: '#000000',
  ghost:     neon.cyan,
  danger:    '#FFFFFF',
  gold:      '#000000',
  glass:     '#EEF0FF',
};

const SIZE_STYLES: Record<ButtonSize, { py: number; px: number; fontSize: number; radius: number }> = {
  sm: { py: 8,  px: 16, fontSize: 13, radius: 10 },
  md: { py: 13, px: 22, fontSize: 15, radius: 14 },
  lg: { py: 16, px: 28, fontSize: 16, radius: 16 },
};

export function Button({
  label,
  onPress,
  variant   = 'primary',
  size      = 'md',
  disabled  = false,
  loading   = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { theme }  = useTheme();
  const { colors } = theme;
  const scale      = useSharedValue(1);
  const sz         = SIZE_STYLES[size];

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isGhost = variant === 'ghost' || variant === 'glass';

  const containerStyle: ViewStyle = {
    borderRadius:    sz.radius,
    overflow:        'hidden',
    alignSelf:       fullWidth ? 'stretch' : 'flex-start',
    opacity:         disabled ? 0.45 : 1,
    borderWidth:     isGhost ? 1 : 0,
    borderColor:     variant === 'ghost' ? colors.border : 'transparent',
  };

  const innerStyle: ViewStyle = {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    paddingVertical:  sz.py,
    paddingHorizontal: sz.px,
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animStyle, containerStyle, style]}
    >
      {isGhost ? (
        <Animated.View style={innerStyle}>
          {loading
            ? <ActivityIndicator size="small" color={TEXT_COLORS[variant]} />
            : icon
          }
          <Text style={[
            styles.label,
            { fontSize: sz.fontSize, color: TEXT_COLORS[variant] },
            textStyle,
          ]}>
            {label}
          </Text>
        </Animated.View>
      ) : (
        <LinearGradient
          colors={GRADIENT_COLORS[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={innerStyle}
        >
          {loading
            ? <ActivityIndicator size="small" color={TEXT_COLORS[variant]} />
            : icon
          }
          <Text style={[
            styles.label,
            { fontSize: sz.fontSize, color: TEXT_COLORS[variant] },
            textStyle,
          ]}>
            {label}
          </Text>
        </LinearGradient>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight:   '800',
    letterSpacing: -0.2,
  },
});
