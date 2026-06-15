/**
 * Per-activity "from repetition to habit" journey — the honest, real-data view of
 * how a single habit is forming: which days it was done (a dot grid), its current
 * streak, and whether it has "graduated". Plus a deterministic, clearly-labelled
 * *illustrative* habit-formation curve for the science explainer (never presented
 * as the user's own data). Pure, no I/O.
 */
import { dayDiff, shiftDayKey } from './dates';
import { sessionDay } from './analytics';
import { SOLIDIFY_DAYS } from './activityStreak';
import { activityStreakDays } from './activityStreak';
import type { ActivitySessionEvent } from './metadata';

/** Average days to automaticity (Lally et al., 2009) — illustrative, never a deadline. */
export const HABIT_DAYS = 66;

export interface DayCell {
  key: string;
  /** Was this activity completed on this day? */
  done: boolean;
  isToday: boolean;
}

/** The last `days` calendar days (oldest first), marking which had this activity. */
export function activityDayCells(
  sessions: readonly ActivitySessionEvent[],
  activityId: string,
  todayKey: string,
  days = 28,
): DayCell[] {
  const done = new Set(sessions.filter((s) => s.activityId === activityId).map(sessionDay));
  const cells: DayCell[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = shiftDayKey(todayKey, -i);
    cells.push({ key, done: done.has(key), isToday: i === 0 });
  }
  return cells;
}

export type JourneyStatus = 'new' | 'building' | 'solidified' | 'graduated';

export interface ActivityJourney {
  activityId: string;
  title: string;
  /** Distinct calendar days this activity was ever completed. */
  totalDays: number;
  /** Consecutive days ending today (or yesterday if not yet done today). */
  currentStreak: number;
  /** First day it was ever done, if any. */
  firstDayKey?: string;
  /** Whole days from first completion to today (the span of the journey). */
  daysSinceStart: number;
  status: JourneyStatus;
  /** Progress of the current streak toward automaticity (0–100). */
  progressPct: number;
  solidified: boolean;
  graduated: boolean;
}

/** Build the honest journey for one activity from the real session log. */
export function activityJourney(
  sessions: readonly ActivitySessionEvent[],
  activityId: string,
  title: string,
  todayKey: string,
): ActivityJourney {
  const days = [...new Set(sessions.filter((s) => s.activityId === activityId).map(sessionDay))].sort();
  const currentStreak = activityStreakDays(sessions, activityId, todayKey);
  const solidified = currentStreak >= SOLIDIFY_DAYS;
  const graduated = currentStreak >= HABIT_DAYS;
  const firstDayKey = days[0];
  const status: JourneyStatus = graduated ? 'graduated' : solidified ? 'solidified' : currentStreak >= 1 ? 'building' : 'new';
  return {
    activityId,
    title,
    totalDays: days.length,
    currentStreak,
    ...(firstDayKey ? { firstDayKey } : {}),
    daysSinceStart: firstDayKey ? dayDiff(firstDayKey, todayKey) + 1 : 0,
    status,
    progressPct: Math.min(100, Math.round((currentStreak / HABIT_DAYS) * 100)),
    solidified,
    graduated,
  };
}

/**
 * Illustrative habit-formation curve: automaticity rising from ~0 to ~1 as the
 * effort to act falls. Deterministic exponential approach — used ONLY for the
 * science explainer, clearly labelled, never as the user's own data.
 */
export function automaticityCurve(samples = 12): number[] {
  const out: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1); // 0..1 across the ~66-day span
    out.push(1 - Math.exp(-3 * t)); // fast early gains, leveling off
  }
  return out;
}

/** Fractional positions (0–1) of the Day 1 / 21 / 66 markers along the curve. */
export const JOURNEY_MARKERS: readonly { day: number; at: number; label: string }[] = [
  { day: 1, at: 0, label: 'Day 1' },
  { day: SOLIDIFY_DAYS, at: SOLIDIFY_DAYS / HABIT_DAYS, label: `Day ${SOLIDIFY_DAYS}` },
  { day: HABIT_DAYS, at: 1, label: `Day ${HABIT_DAYS}` },
];
