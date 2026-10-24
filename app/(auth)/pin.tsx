/**
 * GBECHE — Écran de verrouillage.
 * PIN 4 chiffres + biométrie automatique si activée.
 * Verrouillage temporaire après 5 tentatives échouées.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/src/theme/ThemeContext';
import { PinPad } from '@/src/components/ui/PinPad';
import {
  getBiometricAvailability,
  requestBiometric,
  verifyPin,
} from '@/src/services/security';
import { getSettingBool, SETTING_KEYS } from '@/src/db/settings';
import { useAppStore } from '@/src/store/useAppStore';
import { spacing, typography } from '@/src/theme';

const MAX_ATTEMPTS = 5;
const LOCKDOWN_SECONDS = 30;

export default function PinLock() {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const unlock = useAppStore((s) => s.unlock);

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockdown, setLockdown] = useState(0);
  const [biometricIcon, setBiometricIcon] =
    useState<keyof typeof Ionicons.glyphMap | null>(null);
  const biometricTried = useRef(false);

  useEffect(() => {
    const timer =
      lockdown > 0
        ? setInterval(() => setLockdown((value) => Math.max(0, value - 1)), 1000)
        : null;
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockdown]);

  useEffect(() => {
    (async () => {
      const availability = await getBiometricAvailability();
      const enabled = getSettingBool(SETTING_KEYS.biometricEnabled, false);
      if (availability.enrolled && enabled) {
        setBiometricIcon('finger-print');
      }
    })();
  }, []);

  const enterApp = () => {
    unlock();
    router.replace('/(app)/home');
  };

  const handleBiometric = async () => {
    const ok = await requestBiometric();
    if (ok) enterApp();
  };

  useEffect(() => {
    if (biometricIcon && !biometricTried.current) {
      biometricTried.current = true;
      handleBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricIcon]);

  const handleFull = async (value: string) => {
    if (lockdown > 0) return;
    const valid = await verifyPin(value);
    if (valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      enterApp();
      return;
    }
    setError(true);
    setPin('');
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= MAX_ATTEMPTS) {
      setLockdown(LOCKDOWN_SECONDS);
      setAttempts(0);
    }
    setTimeout(() => setError(false), 600);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['rgba(0,229,255,0.10)', 'rgba(7,9,17,0)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="lock-closed" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Quartier Général verrouillé</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {lockdown > 0
            ? `Trop de tentatives. Réessaie dans ${lockdown} s.`
            : 'Saisis ton code PIN pour reprendre le commandement.'}
        </Text>

        <PinPad
          value={pin}
          onChange={setPin}
          onFull={handleFull}
          error={error}
          biometric={biometricIcon && lockdown === 0 ? handleBiometric : undefined}
          biometricIcon={biometricIcon ?? undefined}
        />
      </View>
      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        GBECHE — 100 % hors-ligne
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  footer: {
    textAlign: 'center',
    paddingBottom: spacing[6],
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
