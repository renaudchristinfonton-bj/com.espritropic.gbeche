/**
 * GBECHE — Navigation principale (tabs).
 * Quartier Général · Guerres · Finances · Réglages.
 * Les modules Calendrier et Agent arrivent en Phase 2.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { useTheme } from '@/src/theme/ThemeContext';
import { FeedbackHost } from '@/src/components/ui/FeedbackHost';
import { NotificationHost } from '@/src/components/ui/NotificationHost';
import { StorageWarning } from '@/src/components/ui/StorageWarning';
import { SwipeTabView } from '@/src/components/ui/SwipeTabView';
import { TutorialHost } from '@/src/components/ui/Tutorial';
import { centeredPanelStyle } from '@/src/theme/layout';
import { typography } from '@/src/theme';

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons name={name} size={focused ? 25 : 23} color={color} />
      {focused ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    </View>
  );
}

export default function AppTabsLayout() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <>
      <SwipeTabView>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0,
            height: Platform.OS === 'ios' ? 88 : 72,
            paddingBottom: Platform.OS === 'ios' ? 28 : 12,
            paddingTop: 10,
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            // Sur web, la barre reste dans la colonne téléphone centrée.
            ...(Platform.OS === 'web' ? centeredPanelStyle : {}),
          },
          tabBarBackground: () =>
            Platform.OS === 'ios' ? (
              <BlurView tint={theme.isDark ? 'dark' : 'light'} intensity={70} style={StyleSheet.absoluteFill} />
            ) : undefined,
          tabBarLabelStyle: {
            fontSize: typography.sizes.xs,
            fontWeight: '700',
          },
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
  iconWrap: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
