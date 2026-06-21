/**
 * Pure calendar helpers for the monthly progress (heatmap) view. No I/O.
 * Days are keyed by local calendar day (YYYY-MM-DD) via dayKey, matching the
 * keys used for streaks and the capacity history log.
 */
import { dayKey } from './dates';

export interface MonthRef {
  year: number;
  /** 0-11 */
  month: number;
}

export interface DayCell {
  /** YYYY-MM-DD, or null for a leading/trailing blank pad cell. */
  key: string | null;
  /** Day of month (1-31), or null for a pad cell. */
  day: number | null;
}

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Current month for a given date. */
export function monthOf(date: Date): MonthRef {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Shift a month by `delta` (handles year wrap). */
export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** "June 2026" */
export function monthLabel(ref: MonthRef, locale = 'en-US'): string {
  return new Date(ref.year, ref.month, 1).toLocaleString(locale, { month: 'long', year: 'numeric' });
}

/**
 * A 7-column matrix of weeks for the month, Sunday-first, with leading/trailing
 * blank pad cells so the grid is rectangular.
 */
export function buildMonthMatrix(ref: MonthRef): DayCell[][] {
  const first = new Date(ref.year, ref.month, 1);
  const lead = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(ref.year, ref.month + 1, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ key: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: dayKey(new Date(ref.year, ref.month, d)), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ key: null, day: null });

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Heatmap intensity bucket (0 = none … 4 = strongest) for a day's points. */
export function intensityLevel(points: number): 0 | 1 | 2 | 3 | 4 {
  if (points <= 0) return 0;
  if (points <= 5) return 1;
  if (points <= 12) return 2;
  if (points <= 24) return 3;
  return 4;
}

/** Whether a month ref is in the future relative to `now` (no data to show). */
export function isFutureMonth(ref: MonthRef, now: Date): boolean {
  return ref.year > now.getFullYear() || (ref.year === now.getFullYear() && ref.month > now.getMonth());
}
