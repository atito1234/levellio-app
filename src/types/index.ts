/**
 * Core domain types for Levellio.
 * Real-life habits, workouts, and goals become quests that level up a hero.
 */

export type QuestDifficulty = 'easy' | 'medium' | 'hard';

/**
 * How a habit is measured beyond simple done/not-done. Absent = a plain "Done"
 * check (the default). 'rating' asks for a quick self-reported 1–5 ("how did it
 * go?") at completion — a universal, metric-agnostic signal that works for any
 * habit, including ones we have no curated science for.
 */
export type HabitMetric = 'rating';

/** A self-reported 1–5 rating value. */
export type RatingValue = 1 | 2 | 3 | 4 | 5;

/** Curated quest categories spanning the areas of a balanced life. */
export type QuestCategory =
  | 'fitness'
  | 'mind'
  | 'learning'
  | 'health'
  | 'productivity'
  | 'relationships'
  | 'creativity'
  | 'finance';

export interface Quest {
  id: string;
  title: string;
  /** Optional, user-authored note about the quest. */
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  /** Base XP awarded before any streak bonus. */
  baseXp: number;
  completed: boolean;
  /** Local day (YYYY-MM-DD) this habit was last completed; drives daily reset. */
  lastCompletedDate?: string;
  /**
   * Optional pinned time of day, as whole minutes since local midnight (0..1439).
   * Lets users schedule a specific time even for untimed activities.
   */
  scheduledTime?: number;
  /**
   * Optional weekly recurrence: weekday indices the habit repeats on
   * (0=Sun … 6=Sat). Absent or empty = not a recurring habit. Recurring habits
   * are materialized into each matching day's plan (see PlanContext).
   */
  scheduledDays?: number[];
  /**
   * Canonical dedup key (= normalizeTitle(title)). Two quests with the same key
   * are the *same activity*; the list holds at most one per key. Optional so
   * legacy data and migrations stay backward-compatible (backfilled on load).
   */
  canonicalKey?: string;
  /**
   * Optional measurement beyond done/not-done. When 'rating', completing the
   * habit asks for a 1–5 "how did it go?". Absent = a plain Done check.
   */
  metric?: HabitMetric;
  /**
   * The user's own reason this habit matters — the personalization source for
   * habits we can't science-match. Shown in the War Room and analytics.
   */
  why?: string;
}

/** Hero progression tiers. */
export type HeroTier = 'novice' | 'pathfinder' | 'luminary';

/** Wisp companion evolution stages. */
export type CompanionStage = 'spark' | 'ember' | 'phoenixling';

/** Hero presentation — same silhouette, any presentation. */
export type HeroPresentation = 'female' | 'male' | 'neutral';

export interface Character {
  id: string;
  name: string;
  presentation: HeroPresentation;
  level: number;
  /** XP accumulated toward the next level (not lifetime total). */
  xp: number;
  /** Consecutive days the user has completed at least one quest. */
  streakDays: number;
  /** Local calendar day (YYYY-MM-DD) of the last completion; drives streaks. */
  lastCompletionDate?: string;
  tier: HeroTier;
  companionStage: CompanionStage;
  /** Selected World Cup nation kit id, or undefined for the classic hoodie. */
  kitId?: string;
}

/** Result of completing a quest — drives the Quest Complete celebration. */
export interface QuestReward {
  questId: string;
  baseXp: number;
  bonusXp: number;
  totalXp: number;
  leveledUp: boolean;
  newLevel: number;
  /** Streak (in days) in effect for this completion. */
  streakDays: number;
}
