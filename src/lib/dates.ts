/**
 * Local calendar-day utilities for streak tracking.
 *
 * Streaks are about the user's *calendar day*, so day keys are derived from
 * local time (not UTC). Day differences are computed from the date parts via
 * UTC midnight to stay immune to daylight-saving offsets.
 */

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference (b - a) between two `YYYY-MM-DD` keys. */
export function dayDiff(a: string, b: string): number {
  return Math.round((keyToUtc(b) - keyToUtc(a)) / 86_400_000);
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-');
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}
