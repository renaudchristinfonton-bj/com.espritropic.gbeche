/**
 * GBECHE — Layout racine.
 * Séquence de boot :
 *   1. Ouverture SQLite + migrations
 *   2. Cache des préférences + amorçage (guerres par défaut, profil)
 *   3. Matérialisation glissante des récurrences
 *   4. Routage d'état : onboarding → PIN → Quartier Général
 * Verrouillage automatique au retour en arrière-plan si un PIN existe.
 */

import React, { useEffect, useState } from 'react';
import { AppState, ActivityIndicator, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
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
import { resolveRouteGroup, routePathFor } from '@/src/services/routing';
import { useAppStore } from '@/src/store/useAppStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function BootGate({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const isUnlocked = useAppStore((state) => state.isUnlocked);
  const lock = useAppStore((state) => state.lock);

  const [booted, setBooted] = useState(false);
  // Le PIN ne peut disparaître qu'après une réinitialisation complète,
  // qui renvoie de toute façon vers l'onboarding : cette valeur est lue
  // une fois au boot, puis le cache settings (lu en direct) pilote le reste.
  const [pinConfigured, setPinConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await openDatabase();
        await loadSettingsCache();
        await seedDefaults();
        await materializeAllTemplates();

        const configured = await hasPin();
        if (cancelled) return;
        setPinConfigured(configured);
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

  // Recalculé à chaque navigation et chaque changement de session :
  // onboardingDone est lu dans le cache settings (mis à jour en synchro
  // dès que le flag est écrit), il ne peut donc plus devenir obsolète.
  useEffect(() => {
    if (!booted) return;

    const onboardingDone = getSettingBool(SETTING_KEYS.onboardingDone, false);
    const desired = resolveRouteGroup({ onboardingDone, pinConfigured, isUnlocked });
    const current = segments[0];

    if (current !== desired) {
      router.replace(routePathFor(desired));
    }
  }, [booted, pinConfigured, isUnlocked, segments, router]);

  // Verrouillage à chaque retour en arrière-plan (ou regain de focus web).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      hasPin()
        .then((configured) => {
          if (!configured) return;
          const group = segments[0];
          if (group !== '(auth)' && group !== '(onboarding)') {
            lock();
            router.replace('/(auth)/pin');
          }
        })
        .catch(() => {});
    });
    return () => subscription.remove();
  }, [router, segments, lock]);

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
  const { theme } = useTheme();

  return (
    <BootGate>
      {/*
        Sur web, l'app est présentée dans une colonne de largeur téléphone
        centrée, avec un fond ambiant plus sombre de chaque côté. Sur mobile,
        le shell occupe tout l'écran.
      */}
      <View style={[styles.webRoot, Platform.OS === 'web' && { backgroundColor: theme.colors.webBackdrop }]}>
        <View
          style={[
            styles.shell,
            Platform.OS === 'web' && {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.glassBorder,
            },
          ]}
        >
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(app)" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </View>
      </View>
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
  webRoot: {
    flex: 1,
  },
  shell: Platform.select({
    web: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      minHeight: '100vh',
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
    },
    default: {
      flex: 1,
    },
  }) as ViewStyle,
});
