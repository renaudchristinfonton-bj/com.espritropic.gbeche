/**
 * GBECHE — Tutoriel guidé du premier lancement.
 *
 * Superposition modale en plusieurs étapes, 100 % locale, relançable
 * depuis les Réglages. La logique de pas est un reducer pur (testable) ;
 * la persistance « tutoriel vu » passe par la clé settings tutorial_done.
 */
import React, { useEffect, useReducer, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, type Ionicons as IoniconsNS } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme';
import { centeredPanelStyle } from '../../theme/layout';
import { useAppStore } from '../../store/useAppStore';
import { getSettingBool, setSettingBool, SETTING_KEYS } from '../../db/settings';
import * as Haptics from '../../services/haptics';
import { Logo } from './Logo';
import {
  initialTutorialState,
  TUTORIAL_STEPS,
  tutorialReducer,
} from './tutorial.model';

type IconName = keyof typeof IoniconsNS.glyphMap;

export function TutorialHost() {
  const { colors } = useTheme().theme;
  const tutorialOpen = useAppStore((s) => s.tutorialOpen);
  const openTutorial = useAppStore((s) => s.openTutorial);
  const closeTutorial = useAppStore((s) => s.closeTutorial);
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const autoChecked = useRef(false);

  // Synchronisation depuis le store global (onboarding, relance manuelle).
  useEffect(() => {
    if (tutorialOpen) dispatch({ type: 'open' });
    else dispatch({ type: 'close' });
  }, [tutorialOpen]);

  // Premier lancement après onboarding : ouverture automatique une seule fois.
  useEffect(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;
    const onboarded = getSettingBool(SETTING_KEYS.onboardingDone, false);
    const seen = getSettingBool(SETTING_KEYS.tutorialDone, false);
    if (onboarded && !seen) openTutorial();
  }, [openTutorial]);

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setSettingBool(SETTING_KEYS.tutorialDone, true);
    dispatch({ type: 'close' });
    closeTutorial();
  };

  const step = TUTORIAL_STEPS[state.index];
  const isLast = state.index === TUTORIAL_STEPS.length - 1;

  return (
    <Modal visible={state.open} transparent animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <SafeAreaView style={[styles.backdrop, { backgroundColor: 'rgba(3,5,12,0.82)' }]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.card,
              centeredPanelStyle,
              { backgroundColor: colors.backgroundElevated, borderColor: colors.glassBorder },
            ]}
          >
            <View style={styles.logoWrap}>
              <Logo size={72} variant="full" />
            </View>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name={step.icon as IconName} size={30} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{step.body}</Text>

            <View style={styles.dots}>
              {TUTORIAL_STEPS.map((s, i) => (
                <View
                  key={s.title}
                  style={[
                    styles.dot,
                    { backgroundColor: i === state.index ? colors.primary : colors.glassBorder },
                  ]}
                />
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Passer le tutoriel"
                onPress={finish}
                style={styles.skip}
                hitSlop={10}
              >
                <Text style={[styles.skipText, { color: colors.textTertiary }]}>Passer</Text>
              </Pressable>
              <View style={styles.rightActions}>
                {state.index > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => dispatch({ type: 'prev' })}
                    style={[styles.ghostBtn, { borderColor: colors.glassBorder }]}
                  >
                    <Ionicons name="arrow-back" size={18} color={colors.primary} />
                    <Text style={[styles.ghostText, { color: colors.primary }]}>Précédent</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => (isLast ? finish() : dispatch({ type: 'next' }))}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                    {isLast ? 'Terminer' : 'Suivant'}
                  </Text>
                  <Ionicons
                    name={isLast ? 'checkmark' : 'arrow-forward'}
                    size={18}
                    color={colors.textInverse}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing[5] },
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    padding: spacing[6],
    gap: spacing[4],
    alignItems: 'center',
  },
  logoWrap: { alignSelf: 'center', marginBottom: spacing[2] },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: typography.sizes['2xl'], fontWeight: '800', textAlign: 'center' },
  body: { fontSize: typography.sizes.md, lineHeight: 23, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginVertical: spacing[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing[2],
  },
  skip: { minHeight: 44, justifyContent: 'center' },
  skipText: { fontSize: typography.sizes.sm, fontWeight: '700' },
  rightActions: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  ghostText: { fontSize: typography.sizes.sm, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: spacing[5],
    borderRadius: radius.lg,
  },
  primaryText: { fontSize: typography.sizes.md, fontWeight: '800' },
});
