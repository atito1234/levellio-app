import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors } from '@/theme';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { QuestCompleteScreen } from '@/screens/QuestCompleteScreen';
import { QuestEditorScreen } from '@/screens/QuestEditorScreen';
import { HabitLibraryScreen } from '@/screens/HabitLibraryScreen';
import { PaywallScreen } from '@/screens/PaywallScreen';
import { LegalScreen } from '@/screens/LegalScreen';
import { KitSelectScreen } from '@/screens/KitSelectScreen';
import { OrganizeScreen } from '@/screens/OrganizeScreen';
import { BucketEditScreen } from '@/screens/BucketEditScreen';
import { RippleScreen } from '@/screens/RippleScreen';
import { ActivityTimerScreen } from '@/screens/ActivityTimerScreen';
import { ConnectionsScreen } from '@/screens/ConnectionsScreen';
import { MonthlyProgressScreen } from '@/screens/MonthlyProgressScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { PlanScreen } from '@/screens/PlanScreen';
import { CapacityFocusScreen } from '@/screens/CapacityFocusScreen';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.identity,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
  },
};

/**
 * Root navigation shell wiring all 5 MVP screens:
 *   Onboarding -> Main (Dashboard / Character / Settings) + QuestComplete modal.
 */
export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="QuestComplete"
          component={QuestCompleteScreen}
          options={{ presentation: 'modal', animation: 'fade' }}
        />
        <Stack.Screen
          name="QuestEditor"
          component={QuestEditorScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="HabitLibrary"
          component={HabitLibraryScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Legal" component={LegalScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="KitSelect"
          component={KitSelectScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Organize" component={OrganizeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="BucketEdit"
          component={BucketEditScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Ripple" component={RippleScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ActivityTimer" component={ActivityTimerScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Connections" component={ConnectionsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="MonthlyProgress" component={MonthlyProgressScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Insights" component={InsightsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Plan" component={PlanScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CapacityFocus" component={CapacityFocusScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
