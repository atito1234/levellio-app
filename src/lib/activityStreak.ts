/**
 * Per-activity consistency, derived from the real session log (no new storage).
 * A habit "solidifies" once it's been done on enough consecutive days — the
 * science-of-habituation moment we celebrate. Pure, no I/O.
 */
import { dayKey, shiftDayKey } from './dates';

/** Days after which a habit is considered "locked in". */
export const SOLIDIFY_DAYS = 21;

type DatedSession = { activityId: string; createdAt: number };

/**
 * Consecutive days (ending today, or yesterday if today isn't done yet) that the
 * activity has at least one session. Sessions are matched by activityId.
 */
export function activityStreakDays(
  sessions: readonly DatedSession[],
  activityId: string,
  today: string,
): number {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.activityId === activityId) days.add(dayKey(new Date(s.createdAt)));
  }
  let cursor = today;
  if (!days.has(cursor)) {
    cursor = shiftDayKey(today, -1); // allow a run that hasn't been continued today yet
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

export function isSolidified(streakDays: number, threshold: number = SOLIDIFY_DAYS): boolean {
  return streakDays >= threshold;
}
