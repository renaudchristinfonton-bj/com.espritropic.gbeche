import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { authenticate } from '@/src/services/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function initAuth() {
      const success = await authenticate();
      if (success) setIsAuthenticated(true);
    }
    initAuth();
  }, []);

  // On pourrait ajouter un écran de verrouillage "Glassmorphism" ici 
  // si isAuthenticated est false

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        ) : (
          <Stack.Screen name="auth_gate" options={{ headerShown: false, title: 'Sécurisé' }} />
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
