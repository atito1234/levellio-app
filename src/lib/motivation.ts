/**
 * Personalized, science-backed motivation. Produces a single short line from the
 * user's REAL history + today's state — never a fabricated stat. Every line is
 * grounded in a habit-science principle (loss aversion / don't-break-the-chain,
 * the fresh-start effect, ~21-day solidification, implementation intentions,
 * the completion/reward loop, consistency-over-intensity).
 *
 * Pure + deterministic (a day-seed only rotates the no-data fallbacks for
 * freshness). Designed to be extended: each line carries a `source`, so a future
 * community "buddy" source can contribute candidates without changing callers.
 */
import { hourLabel, weekdayLabel } from './analytics';
import { SOLIDIFY_DAYS } from './activityStreak';

export type MotivationSource = 'streak' | 'progress' | 'history' | 'goal' | 'science';

export interface MotivationMessage {
  text: string;
  source: MotivationSource;
}

export interface MotivationContext {
  now: Date;
  /** Global daily streak (consecutive days completing any habit). */
  streakDays: number;
  /** Today's planned-habit progress. */
  doneToday: number;
  plannedToday: number;
  /** Whether the user has any logged session history at all. */
  hasHistory: boolean;
  /** The user's most-consistent activity + its current day streak (from real sessions). */
  topActivity?: { title: string; streakDays: number };
  /** Strongest weekday (0=Sun) / hour (0-23) from history, or null when unknown. */
  bestWeekday: number | null;
  bestHour: number | null;
  /** Titles of the user's active goals (for goal tie-ins). */
  goalTitles: readonly string[];
}

const FALLBACK_SCIENCE: readonly string[] = [
  'Small steps, repeated, become who you are.',
  'Tiny habits today compound into who you’ll be.',
  'Showing up beats motivation — make it small.',
  'Consistency is the cheat code. One rep counts.',
  'You don’t rise to your goals; you fall to your habits.',
];

/** Day-of-year, used only to rotate the no-data fallback lines. */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Build the most relevant motivational line for right now. Rules are ordered by
 * psychological pull; the first that fits wins, so the line always reflects the
 * user's actual situation.
 */
export function buildMotivation(ctx: MotivationContext): MotivationMessage {
  const { streakDays, doneToday, plannedToday, topActivity } = ctx;
  const nothingDoneYet = doneToday === 0;

  // 1. Protect an active streak (loss aversion / don't break the chain).
  if (nothingDoneYet && streakDays >= 2) {
    return { source: 'streak', text: `Keep your ${streakDays}-day streak alive — one small win is all it takes.` };
  }

  // 2. Fresh-start effect: a new week/month is the easiest time to restart.
  if (nothingDoneYet && streakDays === 0 && ctx.hasHistory) {
    if (ctx.now.getDate() === 1) {
      return { source: 'science', text: 'New month, clean slate — fresh starts make habits stick. Pick one.' };
    }
    if (ctx.now.getDay() === 1) {
      return { source: 'science', text: 'New week, clean slate — fresh starts make habits stick. Pick one.' };
    }
  }

  // 3. Celebrate a finished plan (consistency over intensity).
  if (plannedToday > 0 && doneToday >= plannedToday) {
    return { source: 'progress', text: 'Plan done! Consistency beats intensity — that’s what compounds.' };
  }

  // 4. Mid-plan: finishing what you start fires the reward loop.
  if (doneToday > 0 && doneToday < plannedToday) {
    return { source: 'progress', text: `${doneToday} down, ${plannedToday - doneToday} to go — finishing wires the reward loop.` };
  }

  // 5. Solidification: nudge a habit toward the ~21-day "automatic" point.
  if (topActivity && topActivity.streakDays >= 1 && topActivity.streakDays < SOLIDIFY_DAYS) {
    const left = SOLIDIFY_DAYS - topActivity.streakDays;
    return {
      source: 'history',
      text: `“${topActivity.title}” is ${topActivity.streakDays} days strong — ${left} more till it runs on autopilot.`,
    };
  }

  // 6. Implementation intentions: lean into the user's strongest time.
  if (nothingDoneYet && ctx.bestWeekday !== null && ctx.now.getDay() === ctx.bestWeekday) {
    return { source: 'history', text: `${weekdayLabel(ctx.bestWeekday)} is your strongest day — line one up now.` };
  }
  if (nothingDoneYet && ctx.bestHour !== null) {
    return { source: 'history', text: `You show up most around ${hourLabel(ctx.bestHour)} — plan a habit for then.` };
  }

  // 7. Tie effort back to a goal (the "why").
  if (ctx.goalTitles.length > 0) {
    const goal = ctx.goalTitles[dayOfYear(ctx.now) % ctx.goalTitles.length]!;
    return { source: 'goal', text: `Every rep moves “${goal}” forward.` };
  }

  // 8. No data yet — a rotating, honest science line.
  return { source: 'science', text: FALLBACK_SCIENCE[dayOfYear(ctx.now) % FALLBACK_SCIENCE.length]! };
}
