/**
 * GBECHE — Coach d'inactivité contextuel.
 *
 * Quand l'utilisateur reste 5 secondes sans interaction sur un écran,
 * une petite bulle glass propose une action pertinente pour cet écran.
 * La proposition est pure (testable) ; le composant gère l'horloge,
 * la détection de touches, le clavier et la préférence de réglage.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';
import { FLOATING_TAB_BAR_HEIGHT } from '../../theme/layout';
import { getSettingBool, setSettingBool, SETTING_KEYS } from '../../db/settings';
import { onInteraction } from '../../services/interactionBus';
import * as Haptics from '../../services/haptics';

const IDLE_DELAY_MS = 5000;
const AUTO_HIDE_MS = 9000;

export interface CoachTip {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: '/(app)/agent';
}

/** Proposition contextuelle par écran (pur, donc testable sans rendu). */
export function coachTipForPath(pathname: string): CoachTip | null {
  if (pathname.startsWith('/agent') || pathname.startsWith('/data')) return null;
  if (pathname.startsWith('/home')) {
    return { text: 'Voulez-vous attaquer ta première mission du jour ?', icon: 'flash', route: '/(app)/agent' };
  }
  if (pathname.startsWith('/calendar')) {
    return { text: 'Voulez-vous planifier une mission à une date précise ?', icon: 'calendar', route: '/(app)/agent' };
  }
  if (pathname.startsWith('/wars')) {
    return { text: 'Voulez-vous créer une nouvelle guerre ou routine ?', icon: 'trophy', route: '/(app)/agent' };
  }
  if (pathname.startsWith('/finance')) {
    return { text: 'Voulez-vous enregistrer une dépense ou un revenu ?', icon: 'wallet', route: '/(app)/agent' };
  }
  if (pathname.startsWith('/settings')) {
    return { text: 'Voulez-vous ajuster tes rappels et notifications ?', icon: 'settings', route: '/(app)/agent' };
  }
  return null;
}

export function IdleCoach() {
  const { colors } = useTheme().theme;
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  // Préférence utilisateur (l'activer par défaut).
  useEffect(() => {
    setEnabled(getSettingBool(SETTING_KEYS.idleCoachEnabled, true));
  }, []);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    idleTimer.current = null;
    hideTimer.current = null;
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    opacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(12, { duration: 180 });
  }, [opacity, translateY]);

  const arm = useCallback(() => {
    clearTimers();
    hide();
    // Lecture fraîche du réglage à chaque cycle : un changement opéré dans
    // Réglages est pris en compte dès la navigation suivante, sans remontage.
    const isEnabled = getSettingBool(SETTING_KEYS.idleCoachEnabled, true);
    setEnabled(isEnabled);
    if (!isEnabled) return;
    const tip = coachTipForPath(pathname);
    if (!tip) return;
    idleTimer.current = setTimeout(() => setVisible(true), IDLE_DELAY_MS);
  }, [clearTimers, hide, pathname]);

  // Réarmement à chaque navigation ou toucher ; arrêt si le clavier s'ouvre.
  useEffect(() => {
    arm();
    const unsubscribe = onInteraction(() => arm());
    const keyboardSub = Keyboard.addListener('keyboardDidShow', () => {
      clearTimers();
      hide();
    });
    return () => {
      clearTimers();
      unsubscribe();
      keyboardSub.remove();
    };
  }, [arm, clearTimers, hide]);

  useEffect(() => {
    if (visible) {
      opacity.value = withSpring(1, { damping: 18, stiffness: 240 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 240 });
      hideTimer.current = setTimeout(hide, AUTO_HIDE_MS);
    }
  }, [visible, opacity, translateY, hide]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const tip = coachTipForPath(pathname);
  if (!enabled || !tip) return null;

  const dismiss = async () => {
    Haptics.selectionAsync().catch(() => {});
    hide();
  };

  const accept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    hide();
    router.push(tip.route);
  };

  const disablePermanently = async () => {
    setEnabled(false);
    await setSettingBool(SETTING_KEYS.idleCoachEnabled, false);
    hide();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + 8 + FLOATING_TAB_BAR_HEIGHT + spacing[16] }]}
    >
      {visible ? (
        <Animated.View
          style={[
            styles.bubble,
            animatedStyle,
            { backgroundColor: colors.backgroundElevated, borderColor: colors.glassBorderHover },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name={tip.icon} size={18} color={colors.primary} />
          </View>
          <Text style={[styles.text, { color: colors.text }]}>{tip.text}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir l'assistant"
              onPress={accept}
              style={({ pressed }) => [styles.goBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.goText, { color: colors.textInverse }]}>Ouvrir</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer l'astuce"
              onPress={dismiss}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Désactiver les astuces"
              onPress={disablePermanently}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Ionicons name="notifications-off" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing[5],
    right: spacing[5],
    zIndex: 45,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    maxWidth: '100%',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  goBtn: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  goText: { fontSize: 12.5, fontWeight: '800' },
  iconBtn: { padding: 4 },
});
