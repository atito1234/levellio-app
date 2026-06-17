import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { colors, typography } from '@/theme';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { CharacterScreen } from '@/screens/CharacterScreen';
import { ProjectsCatalogScreen } from '@/screens/ProjectsCatalogScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const VIOLET = '#6C4CF1';
const MUTED = '#6B6B80';

const tabIcon =
  (glyph: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
  );

/** Restyled bottom tabs. Home ("Today") is a full-bleed, header-less surface. */
export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { ...typography.title, color: colors.textPrimary },
        tabBarActiveTintColor: VIOLET,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#ECEAE4',
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { ...typography.caption, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false, title: 'Today', tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="Character"
        component={CharacterScreen}
        options={{ title: 'Hero', tabBarIcon: tabIcon('🦸') }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsCatalogScreen}
        options={{ headerShown: false, title: 'Projects', tabBarIcon: tabIcon('🤝') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', tabBarIcon: tabIcon('⚙️') }}
      />
    </Tab.Navigator>
  );
}
