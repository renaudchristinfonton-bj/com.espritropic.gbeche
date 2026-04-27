/**
 * GBECHE — Root Layout
 * Fournit : ThemeProvider, I18nProvider, initialisation DB + notifications.
 * Logique de démarrage : onboarding → PIN → app.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { MMKV } from 'react-native-mmkv';

import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';
import { I18nProvider } from '@/src/i18n/I18nProvider';
import { initNotifications } from '@/src/services/notifications';
import { hasPinConfigured } from '@/src/services/crypto';

const onboardingStorage = new MMKV({ id: 'gbeche-onboarding' });

// ─── Inner layout (needs ThemeProvider) ──────────────────

function InnerLayout() {
  const { theme, themeMode } = useTheme();
  const { colors } = theme;
  const router    = useRouter();
  const segments  = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function boot() {
      // Init notifications (non-blocking)
      initNotifications().catch(() => {});

      // Route logic
      const onboardingDone = onboardingStorage.getBoolean('done');

      if (!onboardingDone) {
        router.replace('/(onboarding)/');
        setReady(true);
        return;
      }

      const pinExists = await hasPinConfigured();
      if (pinExists) {
        router.replace('/(auth)/pin');
      } else {
        router.replace('/(app)/home');
      }

      setReady(true);
    }

    boot();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#00E5FF" />
      </View>
    );
  }

  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0B10');

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)"       options={{ animation: 'none' }} />
        <Stack.Screen name="(app)"        options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="modal"        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <InnerLayout />
      </I18nProvider>
    </ThemeProvider>
  );
}

export const unstable_settings = {
  initialRouteName: '(app)',
};

const styles = StyleSheet.create({
  splash: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
