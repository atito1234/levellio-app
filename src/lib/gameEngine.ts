/**
 * Game engine — applies quest completions over time. This is the real,
 * date-aware completion path: it advances the daily streak, applies the streak
 * bonus, awards XP (handling multi-level jumps), and re-derives tier/companion.
 * Pure and deterministic given a `now` — inject the clock in tests.
 */
import { addXp, awardedXp, companionStageForLevel, tierForLevel } from './leveling';
import { advanceStreak } from './streak';
import type { Character, QuestReward } from '@/types';

export interface CompletionResult {
  character: Character;
  reward: QuestReward;
  /** Whether this completion extended/started the streak for a new day. */
  isNewStreakDay: boolean;
  /** Whether a missed day reset the streak. */
  streakReset: boolean;
}

export function completeQuest(
  character: Character,
  baseXp: number,
  questId: string,
  now: Date = new Date(),
): CompletionResult {
  const streak = advanceStreak(
    { streakDays: character.streakDays, lastCompletionDate: character.lastCompletionDate },
    now,
  );

  const totalXp = awardedXp(baseXp, streak.streakDays);
  const bonusXp = totalXp - baseXp;
  const { level, xp, leveledUp } = addXp(character.level, character.xp, totalXp);

  const next: Character = {
    ...character,
    level,
    xp,
    streakDays: streak.streakDays,
    lastCompletionDate: streak.lastCompletionDate,
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
      streakDays: streak.streakDays,
    },
    isNewStreakDay: streak.isNewDay,
    streakReset: streak.reset,
  };
}
