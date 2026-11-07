/**
 * GBECHE — Sheet modale glissante du bas (liquid glass).
 * Basée sur le Modal natif (aucune dépendance tierce), avec fond assombri,
 * flou de surface, animation ressort, safe area basse et — point clé —
 * KeyboardAvoidingView + ScrollView optionnels : un champ de saisie reste
 * toujours visible pendant la frappe, même sur les petits écrans.
 */

import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from '@/src/services/haptics';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import { centeredPanelStyle } from '../../theme/layout';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Active le défilement interne + l'évitement du clavier (formulaires). */
  scroll?: boolean;
  /** Hauteur maximale de la sheet, défaut 90 %. */
  maxHeight?: ViewStyle['maxHeight'];
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
  style,
  scroll = false,
  maxHeight = '90%',
}: SheetProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const translateY = useSharedValue(520);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 260, mass: 0.9 });
    } else {
      translateY.value = withTiming(520, { duration: 180 });
      backdropOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible, translateY, backdropOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdropTint, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={[
              styles.sheet,
              centeredPanelStyle,
              animatedStyle,
              {
                backgroundColor: colors.backgroundElevated,
                borderColor: colors.glassBorderHover,
                maxHeight,
              },
              style,
            ]}
          >
            <BlurView
              tint={theme.isDark ? 'dark' : 'light'}
              intensity={Platform.OS === 'ios' ? 64 : 82}
              style={[StyleSheet.absoluteFill, styles.blurRadius]}
            />
            <SafeAreaView edges={['bottom']} style={styles.safe}>
              <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
              <View style={styles.header}>
                <Text
                  style={[
                    { fontWeight: '800' },
                    { color: colors.text, fontSize: typography.sizes.xl, flex: 1 },
                  ]}
                >
                  {title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                  hitSlop={12}
                  style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                </Pressable>
              </View>
              {scroll ? (
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={{ paddingBottom: spacing[4] }}>{children}</View>
              )}
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTint: {
    backgroundColor: 'rgba(2,3,10,0.72)',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  blurRadius: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
  safe: {
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.full,
    marginVertical: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  closeBtn: {
    marginLeft: spacing[3],
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing[6],
    gap: 2,
  },
});
