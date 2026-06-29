/**
 * Levelling math — the single source of truth for XP and progression.
 *
 *   XP to reach the next level = 100 * level^1.5
 *   Quests award 20 / 40 / 70 XP (easy / medium / hard)
 *   Streak bonus scales up to +100%
 */
import type {
  Character,
  HeroTier,
  CompanionStage,
  QuestDifficulty,
  QuestReward,
} from '@/types';

/** Base XP per difficulty. */
export const QUEST_XP: Record<QuestDifficulty, number> = {
  easy: 20,
  medium: 40,
  hard: 70,
};

/** Each streak day adds 10%, capped at +100% (10 days). */
const STREAK_BONUS_PER_DAY = 0.1;
const MAX_STREAK_BONUS = 1.0;

/** XP required to advance FROM `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(100 * Math.pow(safeLevel, 1.5));
}

/** Streak multiplier in the range [1.0, 2.0]. */
export function streakMultiplier(streakDays: number): number {
  const bonus = Math.min(Math.max(streakDays, 0) * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
  return 1 + bonus;
}

/** Final XP for a quest after applying the streak bonus. */
export function awardedXp(baseXp: number, streakDays: number): number {
  return Math.round(baseXp * streakMultiplier(streakDays));
}

/** Progress toward the next level as a 0..1 fraction (for the XP bar). */
export function levelProgress(character: Pick<Character, 'level' | 'xp'>): number {
  const needed = xpForNextLevel(character.level);
  if (needed <= 0) return 0;
  return Math.min(character.xp / needed, 1);
}

/** Hero tier order, lowest to highest. */
export const TIER_ORDER: readonly HeroTier[] = ['novice', 'pathfinder', 'luminary'];

/** Level at which each hero tier begins. */
export const TIER_START_LEVEL: Record<HeroTier, number> = {
  novice: 1,
  pathfinder: 8,
  luminary: 20,
};

/** Hero tier derived from level. */
export function tierForLevel(level: number): HeroTier {
  if (level >= TIER_START_LEVEL.luminary) return 'luminary';
  if (level >= TIER_START_LEVEL.pathfinder) return 'pathfinder';
  return 'novice';
}

/** Companion stage derived from level (mirrors hero tiers). */
export function companionStageForLevel(level: number): CompanionStage {
  if (level >= TIER_START_LEVEL.luminary) return 'phoenixling';
  if (level >= TIER_START_LEVEL.pathfinder) return 'ember';
  return 'spark';
}

/** Levels remaining until the next tier, or null if already at the top tier. */
export function levelsToNextTier(level: number): number | null {
  const tier = tierForLevel(level);
  if (tier === 'novice') return TIER_START_LEVEL.pathfinder - level;
  if (tier === 'pathfinder') return TIER_START_LEVEL.luminary - level;
  return null;
}

/** Lifetime XP earned across all levels (for "total XP" displays). */
export function lifetimeXp(character: Pick<Character, 'level' | 'xp'>): number {
  let total = character.xp;
  for (let l = 1; l < character.level; l += 1) {
    total += xpForNextLevel(l);
  }
  return total;
}

/**
 * Add XP to a (level, xp) pair, rolling over as many levels as the XP allows.
 * Pure helper shared by the quest-completion paths.
 */
export function addXp(
  level: number,
  xp: number,
  gainedXp: number,
): { level: number; xp: number; leveledUp: boolean } {
  let nextLevel = level;
  let nextXp = xp + gainedXp;
  let leveledUp = false;

  while (nextXp >= xpForNextLevel(nextLevel)) {
    nextXp -= xpForNextLevel(nextLevel);
    nextLevel += 1;
    leveledUp = true;
  }

  return { level: nextLevel, xp: nextXp, leveledUp };
}

/**
 * Inverse of addXp: remove `amount` XP from a (level, xp) pair, rolling DOWN as
 * many levels as needed, clamped at level 1 / 0 xp. Computed via lifetime XP so
 * it exactly round-trips addXp. Used to undo a completion (uncheck).
 */
export function reverseXp(level: number, xp: number, amount: number): { level: number; xp: number } {
  const total = Math.max(0, lifetimeXp({ level, xp }) - Math.max(0, amount));
  let l = 1;
  let remaining = total;
  while (remaining >= xpForNextLevel(l)) {
    remaining -= xpForNextLevel(l);
    l += 1;
  }
  return { level: l, xp: remaining };
}

/**
 * Apply a completed quest to a character using the character's current streak.
 * Returns the next character state and a reward summary. Pure — no mutation.
 *
 * NOTE: This does not advance the streak. Date-based streak progression lives
 * in the game engine (`src/lib/gameEngine.ts`); use that for real completions.
 */
export function applyQuestCompletion(
  character: Character,
  baseXp: number,
  questId: string,
): { character: Character; reward: QuestReward } {
  const totalXp = awardedXp(baseXp, character.streakDays);
  const bonusXp = totalXp - baseXp;
  const { level, xp, leveledUp } = addXp(character.level, character.xp, totalXp);

  const next: Character = {
    ...character,
    level,
    xp,
    tier: tierForLevel(level),
    companionStage: companionStageForLevel(level),
  };

  return {
    character: next,
    reward: {
      questId,
      baseXp,
      bonusXp,
      totalXp,
      leveledUp,
      newLevel: level,
      streakDays: character.streakDays,
    },
  };
}
