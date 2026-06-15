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
  /** World Cup nation kit picker. */
  KitSelect: undefined;
  /** Organize activities into habit buckets (list / buckets view). */
  Organize: undefined;
  /** Create (no param) or edit (bucketId) a habit bucket. */
  BucketEdit: { bucketId?: string } | undefined;
  /** "The Ripple" — the real habit detail (questId), or the seed-action demo. */
  Ripple: { actionId?: string; questId?: string } | undefined;
  /** Countdown ("alarm") for a timed activity, or a Pomodoro focus session. */
  ActivityTimer: { questId: string };
  /** "Connections" — the network map, optionally focused on one activity. */
  Connections: { questId?: string } | undefined;
  /** Monthly capacity progress (heatmap). */
  MonthlyProgress: undefined;
  /**
   * Activity insights. Scope it by one of: a single activity, a category, or a
   * specific day. With no params it shows the overall overview.
   */
  Insights: { activityId?: string; category?: string; day?: string } | undefined;
  /** Curate the habits planned for a day (defaults to today). */
  Plan: { day?: string } | undefined;
  /** "What strengthens this capacity" — the planned/unplanned habits feeding it. */
  CapacityFocus: { capacityId: string };
  /** Create a life goal (from a template or custom). */
  GoalEditor: undefined;
  /** A goal's contributing habits + progress. */
  GoalFocus: { goalId: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Enables typed navigation across the app.
    interface RootParamList extends RootStackParamList {}
  }
}
