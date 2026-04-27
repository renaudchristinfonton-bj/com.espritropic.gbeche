/**
 * GBECHE — GlassCard
 * Carte glassmorphism thémée. Supporte dark/light.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';

interface GlassCardProps {
  children:    React.ReactNode;
  style?:      StyleProp<ViewStyle>;
  onPress?:    () => void;
  accentColor?:string;         // Pour la bordure colorée
  elevated?:   boolean;        // Surface plus haute
  noPadding?:  boolean;
  animated?:   boolean;        // Scale on press
  testID?:     string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  style,
  onPress,
  accentColor,
  elevated = false,
  noPadding = false,
  animated  = true,
  testID,
}: GlassCardProps) {
  const { theme } = useTheme();
  const { colors, radius } = theme;

  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (animated && onPress) {
      scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: elevated ? colors.surfaceHigh : colors.glass,
      borderColor:     accentColor ?? colors.glassBorder,
      borderRadius:    radius.xl,
      padding:         noPadding ? 0 : 18,
    },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animStyle, cardStyle]}
        testID={testID}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[animStyle, cardStyle]} testID={testID}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth:        1,
    overflow:           'hidden',
    // iOS glass blur (via expo-blur dans les screens)
  },
});
