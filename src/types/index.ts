/**
 * Core domain types for Levellio.
 * Real-life habits, workouts, and goals become quests that level up a hero.
 */

export type QuestDifficulty = 'easy' | 'medium' | 'hard';

export type QuestCategory = 'habit' | 'workout' | 'goal';

export interface Quest {
  id: string;
  title: string;
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
}
