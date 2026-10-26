/**
 * GBECHE — Navigation principale (tabs).
 * Barre d'onglets flottante de type pilule, avec flou, pastille active
 * et navigation par balayage (SwipeTabView). Les écrans plein écran
 * (agent, données) masquent la barre via leurs options d'écran.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/theme/ThemeContext';
import { FeedbackHost } from '@/src/components/ui/FeedbackHost';
import { NotificationHost } from '@/src/components/ui/NotificationHost';
import { StorageWarning } from '@/src/components/ui/StorageWarning';
import { SwipeTabView } from '@/src/components/ui/SwipeTabView';
import { TutorialHost } from '@/src/components/ui/Tutorial';
import { floatingTabBarWebStyle, FLOATING_TAB_BAR_HEIGHT } from '@/src/theme/layout';
import { radius, spacing } from '@/src/theme';

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  const { colors } = useTheme().theme;
  return (
    <View
      style={[
        styles.iconPill,
        focused && { backgroundColor: colors.primaryDim },
      ]}
    >
      <Ionicons name={name} size={focused ? 22 : 21} color={color} />
    </View>
  );
}

export default function AppTabsLayout() {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const barHeight = FLOATING_TAB_BAR_HEIGHT;
  const bottomInset = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8);

  return (
    <>
      <SwipeTabView>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.tabActive,
            tabBarInactiveTintColor: colors.tabInactive,
            tabBarLabelStyle: {
              fontSize: 10.5,
              fontWeight: '800',
              letterSpacing: 0.2,
              marginTop: 2,
            },
            tabBarStyle: {
              position: 'absolute',
              left: spacing[4],
              right: spacing[4],
              bottom: bottomInset + 8,
              height: barHeight,
              borderRadius: radius['2xl'],
              borderWidth: 1,
              borderColor: colors.tabBarBorder,
              backgroundColor: colors.tabBarBg,
              elevation: 0,
              shadowColor: '#000000',
              shadowOpacity: 0.35,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              paddingTop: 8,
              paddingBottom: 8,
              // Sur web, la pilule reste centrée dans la colonne téléphone.
              ...(Platform.OS === 'web' ? floatingTabBarWebStyle : {}),
            },
            tabBarBackground: () => (
              <BlurView
                tint={theme.isDark ? 'dark' : 'light'}
                intensity={Platform.OS === 'ios' ? 72 : 90}
                style={[StyleSheet.absoluteFill, { borderRadius: radius['2xl'], overflow: 'hidden' }]}
              />
            ),
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: 'QG',
              tabBarIcon: ({ focused, color }) => (
                <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              title: 'Agenda',
              tabBarIcon: ({ focused, color }) => (
                <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="wars"
            options={{
              title: 'Guerres',
              tabBarIcon: ({ focused, color }) => (
                <TabIcon name={focused ? 'trophy' : 'trophy-outline'} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="finance"
            options={{
              title: 'Finances',
              tabBarIcon: ({ focused, color }) => (
                <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Réglages',
              tabBarIcon: ({ focused, color }) => (
                <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} color={color} />
              ),
            }}
          />
          {/* Écrans plein écran atteints par navigation : pas de bouton dans la
              barre (href: null) et barre masquée tant qu'ils sont au premier plan. */}
          <Tabs.Screen
            name="agent"
            options={{
              href: null,
              tabBarStyle: { display: 'none' },
            }}
          />
          <Tabs.Screen
            name="data"
            options={{
              href: null,
              tabBarStyle: { display: 'none' },
            }}
          />
        </Tabs>
      </SwipeTabView>
      <StorageWarning />
      <NotificationHost />
      <FeedbackHost />
      <TutorialHost />
    </>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 40,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
