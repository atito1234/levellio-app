/**
 * Date-based daily streak logic.
 *
 * Rules:
 *   - The first completion ever starts a 1-day streak.
 *   - A completion on the day after the last one extends the streak (+1).
 *   - Additional completions on the same calendar day do NOT change the streak.
 *   - Missing one or more full days resets the streak to 1.
 *   - A backwards clock (last date in the future) is treated as a reset.
 */
import { dayDiff, dayKey } from './dates';

export interface StreakState {
  streakDays: number;
  lastCompletionDate?: string;
}

export interface StreakUpdate {
  streakDays: number;
  lastCompletionDate: string;
  /** True when this is the first completion of the current day. */
  isNewDay: boolean;
  /** True when a missed day (or clock anomaly) reset the streak. */
  reset: boolean;
}

export function advanceStreak(state: StreakState, now: Date): StreakUpdate {
  const today = dayKey(now);
  const last = state.lastCompletionDate;

  if (!last) {
    return { streakDays: 1, lastCompletionDate: today, isNewDay: true, reset: false };
  }

  const diff = dayDiff(last, today);

  if (diff === 0) {
    // Same calendar day — keep the streak, but never below 1.
    return {
      streakDays: Math.max(state.streakDays, 1),
      lastCompletionDate: today,
      isNewDay: false,
      reset: false,
    };
  }

  if (diff === 1) {
    return {
      streakDays: state.streakDays + 1,
      lastCompletionDate: today,
      isNewDay: true,
      reset: false,
    };
  }

  // diff >= 2 (missed a day) or diff < 0 (clock moved backwards) -> reset.
  return { streakDays: 1, lastCompletionDate: today, isNewDay: true, reset: true };
}
