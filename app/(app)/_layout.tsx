/**
 * GBECHE — App Tab Layout
 * Tabs thémés avec Ionicons, badge streak, couleurs dynamiques.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

import { useTheme } from '@/src/theme/ThemeContext';
import { useAppStore } from '@/src/store';

function TabIcon({
  name,
  focused,
  color,
  badge,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  badge?: number;
}) {
  return (
    <View style={ti.wrap}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
        size={24}
        color={color}
      />
      {badge ? (
        <View style={ti.badge}>
          <Text style={ti.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const ti = StyleSheet.create({
  wrap:      { position: 'relative', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  badge:     { position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#FF4757', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
});

export default function AppLayout() {
  const { theme, themeMode } = useTheme();
  const { colors }           = theme;
  const warrior              = useAppStore(s => s.warrior);

  const ACTIVE   = '#00E5FF';
  const INACTIVE = colors.textMuted ?? '#666';
  const BG       = colors.tabBar   ?? colors.background;

  const isDark = BG.startsWith('rgba(0') || BG === '#0A0B10' || themeMode === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor:  BG,
          borderTopColor:   colors.glassBorder,
          borderTopWidth:   1,
          height:           Platform.OS === 'ios' ? 84 : 64,
          paddingBottom:    Platform.OS === 'ios' ? 24 : 8,
          elevation:        0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wars"
        options={{
          title: 'Guerres',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="flame" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Finance',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="wallet" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="calendar" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Agent',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="chatbubble-ellipses" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
