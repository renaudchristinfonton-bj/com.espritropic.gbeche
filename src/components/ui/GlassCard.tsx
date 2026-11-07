/**
 * GBECHE — GlassCard
 * Carte glassmorphism thémée. Supporte dark/light.
 *
 * La prop `blur` active un vrai flou de fond (expo-blur) pour les
 * surfaces élevées ; par défaut elle reste désactivée afin de ne pas
 * multiplier les calques de flou et préserver la fluidité. Un fond
 * semi-transparent de la charte est superposé au flou pour garder une
 * teinte homogène sur iOS, Android et le web.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';

type BlurStrength = 'none' | 'light' | 'strong';

interface GlassCardProps {
  children:    React.ReactNode;
  style?:      StyleProp<ViewStyle>;
  onPress?:    () => void;
  accentColor?:string;         // Pour la bordure colorée
  elevated?:   boolean;        // Surface plus haute
  noPadding?:  boolean;
  animated?:   boolean;        // Scale on press
  blur?:       BlurStrength;   // Vrai flou de fond (défaut none)
  testID?:     string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BLUR_INTENSITY: Record<Exclude<BlurStrength, 'none'>, number> = {
  light: 28,
  strong: 48,
};

export function GlassCard({
  children,
  style,
  onPress,
  accentColor,
  elevated = false,
  noPadding = false,
  animated  = true,
  blur = 'none',
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

  const isDark = theme.mode === 'dark';
  const useBlur = blur !== 'none';

  const cardStyle = [
    styles.card,
    {
      // Le flou fournit le fond ; sinon teinte pleine de la charte.
      backgroundColor: useBlur ? 'transparent' : elevated ? colors.surfaceHigh : colors.glass,
      borderColor:     accentColor ?? colors.glassBorder,
      borderRadius:    radius.xl,
    },
    style,
  ];

  const content = (
    <>
      {useBlur ? (
        <>
          <BlurView
            intensity={BLUR_INTENSITY[blur as Exclude<BlurStrength, 'none'>]}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: elevated ? colors.surfaceHigh : colors.glass },
            ]}
          />
        </>
      ) : null}
      <View style={noPadding ? styles.noPadding : styles.padded}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animStyle, cardStyle]}
        testID={testID}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[animStyle, cardStyle]} testID={testID}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: { padding: 18 },
  noPadding: { padding: 0 },
});
