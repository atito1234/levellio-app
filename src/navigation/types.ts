import type { NavigatorScreenParams } from '@react-navigation/native';
import type { QuestCategory, QuestReward } from '@/types';
import type { QuestDraft } from '@/lib/questForm';
import type { PostKind } from '@/lib/community';
import type { ContributionMode } from '@/lib/projects';
import type { LegalDocKey } from '@/content/aboutInfo';

/** Main app tabs (shown after onboarding). */
export type MainTabParamList = {
  Dashboard: undefined;
  Character: undefined;
  Feed: undefined;
  Projects: undefined;
  Settings: undefined;
};

/** Root stack: onboarding -> main app, with modals layered on top. */
export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  QuestComplete: { reward: QuestReward } | undefined;
  /** Create (no param), edit (questId), or create pre-filled from the quick sheet (prefill). */
  QuestEditor: { questId?: string; prefill?: Partial<QuestDraft>; goalId?: string; bucketId?: string; projectIds?: string[] } | undefined;
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
  /** Create a life goal (from a template or custom), or edit one (goalId). */
  GoalEditor: { goalId?: string } | undefined;
  /** Gamified "become" goal creation: pick identity → swipe activities → first vote. */
  NewGoal: undefined;
  /** A goal's contributing habits + progress. */
  GoalFocus: { goalId: string };
  /** Frictionless typed/dictated capture of one or more habits (optionally pre-filed into a goal/group/project). */
  QuickCapture: { goalId?: string; bucketId?: string; projectIds?: string[] } | undefined;
  /** Set up a focus Battle: choose habits, technique, and dragon. */
  BattleSetup: { questId?: string; questIds?: string[]; bucketId?: string; goalId?: string } | undefined;
  /** The gamified focus session — slay the dragon, complete the bundled habits. */
  Battle: {
    questIds: string[];
    techniqueId: import('@/lib/timeTechniques').TechniqueId;
    customMin?: number;
    dragonId: string;
    dragonName?: string;
  };
  /** Write a battle-journal reflection (what's stopping you). */
  JournalComposer: { dragonId?: string; dragonName?: string; questIds?: string[]; prompt?: string; teaching?: string } | undefined;
  /** The battle-journal feed (optionally filtered to one dragon). */
  Journal: { dragonId?: string } | undefined;
  /** Hero analytics — milestone-gated "are you headed the right way?" dashboard. */
  Analytics: undefined;
  /** "Confront your dragon" — Socratic questions + a matched tactic for a blocker. */
  CoachingEncounter: { dragonId: string; dragonName?: string; questId?: string; minutesAvailable?: number; blockerId?: string } | undefined;
  /** One activity's "from repetition to habit" journey (curve, past days, status). */
  ActivityJourney: { activityId: string };
  /** Unified Progress hub: Overview / Goals / Buckets / Capacities / Habits. */
  Progress: { tab?: 'overview' | 'goals' | 'buckets' | 'capacities' | 'habits' } | undefined;
  /** A community project's shared progress, members, and live activity feed. */
  ProjectDetail: { projectId: string };
  /** Create a new community project. */
  ProjectEditor: undefined;
  /** Join a project by invite code (optionally pre-filled from a deep link). */
  JoinProject: { code?: string } | undefined;
  /** Sign in / create an account to unlock community projects. */
  SignIn: undefined;
  /** Compose a community post, an "ask peers" request, or a completion "win" (kind:'contribution'). */
  PostComposer:
    | { projectId?: string; kind?: PostKind; categoryHint?: QuestCategory; habitTitle?: string; value?: number; mode?: ContributionMode }
    | undefined;
  /** A single post with its comment thread. */
  PostDetail: { postId: string };
  /** Discover & manage the people in your network. */
  People: undefined;
  /** A user's public profile (habits, streaks, milestones, posts). */
  Profile: { uid: string };
  /** The in-app notification center (reactions, comments, follows). */
  Notifications: undefined;
  /** Search & discover people, habits, and projects. */
  Discover: undefined;
  /** Full-screen story viewer for one user's active stories. */
  StoryViewer: { uid: string };
  /** Direct-message conversation list. */
  Inbox: undefined;
  /** A 1:1 chat with another user. */
  Chat: { uid: string; displayName?: string; presentation?: import('@/types').HeroPresentation };
  /** Explainer for Levellio's AI options + running a model on-device. */
  AISetup: undefined;
  /** Your personalized recipe collection (recommended + saved), matched to your diet. */
  Recipes: undefined;
  /** Your checklists — keep lists, tick them off, and check out for a streak. */
  Checklists: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Enables typed navigation across the app.
    interface RootParamList extends RootStackParamList {}
  }
}
