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

/** Shift a `YYYY-MM-DD` key by whole days (DST-safe via local date parts). */
export function shiftDayKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  return dayKey(dt);
}

/** Friendly label for a day key, e.g. "Sun, Jun 14". */
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Today" / "Tomorrow" / "Yesterday" relative to `todayKey`, else the formatted day. */
export function relativeDayLabel(key: string, todayKey: string): string {
  const diff = dayDiff(todayKey, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDayKey(key);
}
