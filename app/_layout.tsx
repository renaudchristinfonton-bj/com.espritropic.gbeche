/**
 * GBECHE — Layout racine.
 * Séquence de boot :
 *   1. Ouverture SQLite + migrations
 *   2. Cache des préférences + amorçage (guerres par défaut, profil)
 *   3. Matérialisation glissante des récurrences
 *   4. Routage : onboarding → PIN → Quartier Général
 * Verrouillage automatique au retour en arrière-plan si un PIN existe.
 */

import React, { useEffect, useState } from 'react';
import { AppState, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { I18nProvider } from '@/src/i18n/I18nProvider';
import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';
import { openDatabase } from '@/src/db/client';
import { loadSettingsCache, getSettingBool, SETTING_KEYS } from '@/src/db/settings';
import { seedDefaults } from '@/src/services/seed';
import { materializeAllTemplates } from '@/src/db/repositories/adversaries.repo';
import { hasPin } from '@/src/services/security';

SplashScreen.preventAutoHideAsync().catch(() => {});

type BootTarget = 'onboarding' | 'pin' | 'app';

function BootGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [booted, setBooted] = useState(false);
  const [target, setTarget] = useState<BootTarget>('app');

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await openDatabase();
        await loadSettingsCache();
        await seedDefaults();
        await materializeAllTemplates();

        const onboardingDone = getSettingBool(SETTING_KEYS.onboardingDone, false);
        const pinConfigured = await hasPin();

        if (cancelled) return;
        if (!onboardingDone) setTarget('onboarding');
        else if (pinConfigured) setTarget('pin');
        else setTarget('app');
      } catch (error) {
        console.error('[boot]', error);
      } finally {
        if (!cancelled) {
          setBooted(true);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!booted) return;
    const current = segments[0];
    const routeMap: Record<BootTarget, string> = {
      onboarding: '(onboarding)',
      pin: '(auth)',
      app: '(app)',
    };
    const expected = routeMap[target];
    if (current !== expected) {
      router.replace(target === 'onboarding' ? '/(onboarding)' : target === 'pin' ? '/(auth)/pin' : '/(app)/home');
    }
  }, [booted, target, segments, router]);

  // Verrouillage à chaque retour en arrière-plan.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      hasPin()
        .then((pinConfigured) => {
          if (!pinConfigured) return;
          const group = segments[0];
          if (group !== '(auth)' && group !== '(onboarding)') {
            router.replace('/(auth)/pin');
          }
        })
        .catch(() => {});
    });
    return () => subscription.remove();
  }, [router, segments]);

  if (!booted) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigator() {
  const { themeMode } = useTheme();

  return (
    <BootGate>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(app)" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </BootGate>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <RootNavigator />
      </I18nProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
