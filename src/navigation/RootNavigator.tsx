import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors } from '@/theme';
import { useSettings } from '@/state/SettingsContext';
import { useGame } from '@/state/GameContext';
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
import { GoalEditorScreen } from '@/screens/GoalEditorScreen';
import { GoalFocusScreen } from '@/screens/GoalFocusScreen';
import { QuickCaptureScreen } from '@/screens/QuickCaptureScreen';
import { BattleSetupScreen } from '@/screens/BattleSetupScreen';
import { BattleScreen } from '@/screens/BattleScreen';
import { JournalComposerScreen } from '@/screens/JournalComposerScreen';
import { JournalScreen } from '@/screens/JournalScreen';
import { AnalyticsScreen } from '@/screens/AnalyticsScreen';
import { CoachingEncounterScreen } from '@/screens/CoachingEncounterScreen';
import { ActivityJourneyScreen } from '@/screens/ActivityJourneyScreen';
import { ProgressHubScreen } from '@/screens/ProgressHubScreen';
import { ProjectDetailScreen } from '@/screens/ProjectDetailScreen';
import { ProjectEditorScreen } from '@/screens/ProjectEditorScreen';
import { JoinProjectScreen } from '@/screens/JoinProjectScreen';
import { SignInScreen } from '@/screens/SignInScreen';
import { PostComposerScreen } from '@/screens/PostComposerScreen';
import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { PeopleScreen } from '@/screens/PeopleScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { StoryViewerScreen } from '@/screens/StoryViewerScreen';
import { InboxScreen } from '@/screens/InboxScreen';
import { ChatScreen } from '@/screens/ChatScreen';
import { AISetupScreen } from '@/screens/AISetupScreen';
import { RecipesScreen } from '@/screens/RecipesScreen';
import { ChecklistsScreen } from '@/screens/ChecklistsScreen';
import { MilestoneCelebration } from '@/components/MilestoneCelebration';
import { InterventionOverlay } from '@/components/InterventionOverlay';
import { SpotlightProvider, SpotlightOverlay } from '@/components/spotlight';
import { navigationRef } from './navigationRef';
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

/** Deep links, e.g. levellio://join/MALARIA → the Join-by-code screen, prefilled. */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['levellio://'],
  config: {
    screens: {
      JoinProject: 'join/:code',
    },
  },
};

/**
 * Root navigation shell wiring all 5 MVP screens:
 *   Onboarding -> Main (Dashboard / Character / Settings) + QuestComplete modal.
 */
export function RootNavigator() {
  const { settings, ready: settingsReady, update } = useSettings();
  const { status, character } = useGame();

  // Wait until settings + game state are known so we pick the right first screen
  // (and don't flash Onboarding for returning users).
  if (!settingsReady || status !== 'ready') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.identity} />
      </View>
    );
  }

  // Show the welcome flow only on a genuine first run. Returning users — even
  // those from before the flag existed — already have a character, so skip it.
  const initialRouteName: keyof RootStackParamList =
    settings.onboardingCompleted || character ? 'Main' : 'Onboarding';

  return (
    <SpotlightProvider onDone={() => void update({ welcomeTourCompleted: true })}>
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name="GoalEditor" component={GoalEditorScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="GoalFocus" component={GoalFocusScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="QuickCapture" component={QuickCaptureScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="BattleSetup" component={BattleSetupScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Battle" component={BattleScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="JournalComposer" component={JournalComposerScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Journal" component={JournalScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="CoachingEncounter" component={CoachingEncounterScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ActivityJourney" component={ActivityJourneyScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Progress" component={ProgressHubScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="ProjectEditor" component={ProjectEditorScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="JoinProject" component={JoinProjectScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="PostComposer" component={PostComposerScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="People" component={PeopleScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Discover" component={DiscoverScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Inbox" component={InboxScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="AISetup" component={AISetupScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Recipes" component={RecipesScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Checklists" component={ChecklistsScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
      {/* Overlays any screen to celebrate earned milestones (queue-driven). */}
      <MilestoneCelebration />
      {/* "Think twice" coaching pause when quitting something with stakes. */}
      <InterventionOverlay />
      {/* Once-only, controlled first-run welcome tour. */}
      <SpotlightOverlay />
    </NavigationContainer>
    </SpotlightProvider>
  );
}
