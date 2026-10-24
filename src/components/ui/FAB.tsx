/**
 * GBECHE — Bouton d'action flottant avec menu d'actions rapides.
 */

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/src/services/haptics';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';

export interface FabAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface FABProps {
  actions: FabAction[];
  onSelect: (key: string) => void;
}

export function FAB({ actions, onSelect }: FABProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const menuOpacity = useSharedValue(0);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !open;
    setOpen(next);
    rotation.value = withSpring(next ? 45 : 0, { damping: 16, stiffness: 220 });
    menuOpacity.value = withTiming(next ? 1 : 0, { duration: 180 });
  };

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const menuStyle = useAnimatedStyle(() => ({ opacity: menuOpacity.value }));

  return (
    <>
      <Modal visible={open} transparent animationType="none" onRequestClose={toggle}>
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle}>
          <View style={[styles.backdrop, { backgroundColor: colors.overlay }]} />
        </Pressable>
        <View style={styles.menu} pointerEvents="box-none">
          <Animated.View style={menuStyle}>
            {actions.map((action, index) => (
              <Pressable
                key={action.key}
                style={[
                  styles.actionRow,
                  { backgroundColor: colors.backgroundElevated, borderColor: colors.glassBorder },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggle();
                  setTimeout(() => onSelect(action.key), 120);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}1F` }]}>
                  <Ionicons name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </Modal>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Actions rapides"
        onPress={toggle}
        style={[
          styles.fab,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
      >
        <Animated.View style={fabStyle}>
          <Ionicons name="add" size={30} color={colors.textInverse} />
        </Animated.View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing[5],
    bottom: spacing[6],
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 50,
  },
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    right: spacing[5],
    bottom: 130,
    gap: spacing[3],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[2.5],
    minWidth: 210,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
});
