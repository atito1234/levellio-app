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

/** Hero tier derived from level. */
export function tierForLevel(level: number): HeroTier {
  if (level >= 20) return 'luminary';
  if (level >= 8) return 'pathfinder';
  return 'novice';
}

/** Companion stage derived from level (mirrors hero tiers). */
export function companionStageForLevel(level: number): CompanionStage {
  if (level >= 20) return 'phoenixling';
  if (level >= 8) return 'ember';
  return 'spark';
}

/**
 * Apply a completed quest to a character. Returns the next character state and
 * a reward summary describing the celebration to show. Pure — no mutation.
 */
export function applyQuestCompletion(
  character: Character,
  baseXp: number,
  questId: string,
): { character: Character; reward: QuestReward } {
  const totalXp = awardedXp(baseXp, character.streakDays);
  const bonusXp = totalXp - baseXp;

  let level = character.level;
  let xp = character.xp + totalXp;
  let leveledUp = false;

  // Roll over as many levels as the XP allows.
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
    leveledUp = true;
  }

  const next: Character = {
    ...character,
    level,
    xp,
    tier: tierForLevel(level),
    companionStage: companionStageForLevel(level),
  };

  return {
    character: next,
    reward: { questId, baseXp, bonusXp, totalXp, leveledUp, newLevel: level },
  };
}
