import type { NavigatorScreenParams } from '@react-navigation/native';
import type { QuestReward } from '@/types';
import type { LegalDocKey } from '@/content/aboutInfo';

/** Main app tabs (shown after onboarding). */
export type MainTabParamList = {
  Dashboard: undefined;
  Character: undefined;
  Settings: undefined;
};

/** Root stack: onboarding -> main app, with modals layered on top. */
export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  QuestComplete: { reward: QuestReward } | undefined;
  /** Create (no param) or edit (questId) a quest. */
  QuestEditor: { questId?: string } | undefined;
  HabitLibrary: undefined;
  Paywall: undefined;
  /** In-app legal viewer: Privacy Policy or Terms of Service. */
  Legal: { doc: LegalDocKey };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Enables typed navigation across the app.
    interface RootParamList extends RootStackParamList {}
  }
}
