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

/** Friendly label for a day key, e.g. "Sun, Jun 14". Locale defaults to en-US. */
export function formatDayKey(key: string, locale = 'en-US'): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Optional localized words + date locale for {@link relativeDayLabel}. */
export interface RelativeDayLabels {
  today?: string;
  tomorrow?: string;
  yesterday?: string;
  locale?: string;
}

/**
 * "Today" / "Tomorrow" / "Yesterday" relative to `todayKey`, else the formatted
 * day. Pass localized words via `opts` (English when omitted, so callers and
 * tests that don't translate keep working).
 */
export function relativeDayLabel(key: string, todayKey: string, opts: RelativeDayLabels = {}): string {
  const diff = dayDiff(todayKey, key);
  if (diff === 0) return opts.today ?? 'Today';
  if (diff === 1) return opts.tomorrow ?? 'Tomorrow';
  if (diff === -1) return opts.yesterday ?? 'Yesterday';
  return formatDayKey(key, opts.locale);
}
