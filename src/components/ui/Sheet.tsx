/**
 * GBECHE — Sheet modale glissante du bas.
 * Basée sur le Modal natif (aucune dépendance tierce), avec fond assombri,
 * safe area basse et animation de translation.
 */

import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Sheet({ visible, title, onClose, children, style }: SheetProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const translateY = useSharedValue(400);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 260 });
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            animatedStyle,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.glassBorder,
            },
            style,
          ]}
        >
          <SafeAreaView edges={['bottom']}>
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
              >
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={{ paddingBottom: spacing[4] }}>{children}</View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.66)',
  },
  sheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    maxHeight: '88%',
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
});
