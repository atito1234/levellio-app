/**
 * Scheduling helpers — let users pin a specific clock time to an activity
 * (especially handy for untimed events). A schedule is stored as whole minutes
 * since local midnight (0..1439), so it's timezone-agnostic and easy to compare.
 * Pure logic, no React, fully unit-testable.
 */

export const MINUTES_IN_DAY = 1440;

export type Meridiem = 'AM' | 'PM';

export interface TimeParts {
  /** 12-hour clock hour (1..12). */
  hour12: number;
  /** Minute (0..59). */
  minute: number;
  meridiem: Meridiem;
}

/** True when `min` is a valid minutes-since-midnight value (integer 0..1439). */
export function isValidScheduleMinutes(min: unknown): min is number {
  return typeof min === 'number' && Number.isInteger(min) && min >= 0 && min < MINUTES_IN_DAY;
}

/** Clamp any number into the valid 0..1439 range (rounding to a whole minute). */
export function clampScheduleMinutes(min: number): number {
  if (!Number.isFinite(min)) return 0;
  return Math.min(MINUTES_IN_DAY - 1, Math.max(0, Math.round(min)));
}

/** Convert 12-hour clock parts into minutes since midnight. */
export function partsToMinutes(parts: TimeParts): number {
  const h12 = Math.min(12, Math.max(1, Math.round(parts.hour12)));
  const minute = Math.min(59, Math.max(0, Math.round(parts.minute)));
  const base = h12 % 12; // 12 -> 0
  const hour24 = parts.meridiem === 'PM' ? base + 12 : base;
  return clampScheduleMinutes(hour24 * 60 + minute);
}

/** Split minutes-since-midnight into 12-hour clock parts. */
export function minutesToParts(min: number): TimeParts {
  const m = clampScheduleMinutes(min);
  const hour24 = Math.floor(m / 60);
  const minute = m % 60;
  const meridiem: Meridiem = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute, meridiem };
}

/** Human label for a scheduled time, e.g. "7:30 AM" or "9:00 PM". */
export function minutesToLabel(min: number): string {
  const { hour12, minute, meridiem } = minutesToParts(min);
  return `${hour12}:${`${minute}`.padStart(2, '0')} ${meridiem}`;
}
