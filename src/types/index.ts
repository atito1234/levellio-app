/**
 * Core domain types for Levellio.
 * Real-life habits, workouts, and goals become quests that level up a hero.
 */

export type QuestDifficulty = 'easy' | 'medium' | 'hard';

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
