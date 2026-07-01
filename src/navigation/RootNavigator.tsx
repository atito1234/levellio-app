import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors } from '@/theme';
import { BUCKETS_ENABLED } from '@/config/features';
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
import { NewGoalFlowScreen } from '@/screens/NewGoalFlowScreen';
import { GoalFocusScreen } from '@/screens/GoalFocusScreen';
import { QuickCaptureScreen } from '@/screens/QuickCaptureScreen';
import { BattleSetupScreen } from '@/screens/BattleSetupScreen';
import { BattleScreen } from '@/screens/BattleScreen';
import { PrepareRiteScreen } from '@/screens/PrepareRiteScreen';
import { DragonDenScreen } from '@/screens/DragonDenScreen';
import { AchievementsScreen } from '@/screens/AchievementsScreen';
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
import { AdminModerationScreen } from '@/screens/AdminModerationScreen';
import { FoundingGateScreen } from '@/screens/FoundingGateScreen';
import { ProjectApplicationScreen } from '@/screens/ProjectApplicationScreen';
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
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="QuestComplete"
          component={QuestCompleteScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name="QuestEditor" component={QuestEditorScreen} />
        <Stack.Screen name="HabitLibrary" component={HabitLibraryScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="KitSelect" component={KitSelectScreen} />
        {/* Buckets retired from the UI (BUCKETS_ENABLED); code kept for re-enable. */}
        {BUCKETS_ENABLED && <Stack.Screen name="Organize" component={OrganizeScreen} />}
        {BUCKETS_ENABLED && <Stack.Screen name="BucketEdit" component={BucketEditScreen} />}
        <Stack.Screen name="Ripple" component={RippleScreen} />
        <Stack.Screen name="ActivityTimer" component={ActivityTimerScreen} />
        <Stack.Screen name="Connections" component={ConnectionsScreen} />
        <Stack.Screen name="MonthlyProgress" component={MonthlyProgressScreen} />
        <Stack.Screen name="Insights" component={InsightsScreen} />
        <Stack.Screen name="Plan" component={PlanScreen} />
        <Stack.Screen name="CapacityFocus" component={CapacityFocusScreen} />
        <Stack.Screen name="GoalEditor" component={GoalEditorScreen} />
        <Stack.Screen name="NewGoal" component={NewGoalFlowScreen} />
        <Stack.Screen name="GoalFocus" component={GoalFocusScreen} />
        <Stack.Screen name="QuickCapture" component={QuickCaptureScreen} />
        <Stack.Screen name="BattleSetup" component={BattleSetupScreen} />
        <Stack.Screen name="Battle" component={BattleScreen} />
        <Stack.Screen name="PrepareRite" component={PrepareRiteScreen} />
        <Stack.Screen name="DragonDen" component={DragonDenScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="JournalComposer" component={JournalComposerScreen} />
        <Stack.Screen name="Journal" component={JournalScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="CoachingEncounter" component={CoachingEncounterScreen} />
        <Stack.Screen name="ActivityJourney" component={ActivityJourneyScreen} />
        <Stack.Screen name="Progress" component={ProgressHubScreen} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <Stack.Screen name="ProjectEditor" component={ProjectEditorScreen} />
        <Stack.Screen name="JoinProject" component={JoinProjectScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="PostComposer" component={PostComposerScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="People" component={PeopleScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
        <Stack.Screen name="FoundingGate" component={FoundingGateScreen} />
        <Stack.Screen name="ProjectApplication" component={ProjectApplicationScreen} />
        <Stack.Screen name="Discover" component={DiscoverScreen} />
        <Stack.Screen name="StoryViewer" component={StoryViewerScreen} />
        <Stack.Screen name="Inbox" component={InboxScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="AISetup" component={AISetupScreen} />
        <Stack.Screen name="Recipes" component={RecipesScreen} />
        <Stack.Screen name="Checklists" component={ChecklistsScreen} />
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
