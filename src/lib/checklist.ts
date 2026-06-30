/**
 * Checklists — pure logic. A checklist is a small, ordered set of items the user
 * ticks off and then "checks out" of (a closing ritual that builds a daily
 * check-out streak). Recurring lists reset their ticks each day; one-off lists
 * archive when checked out. No I/O — fully unit-testable.
 *
 * Retention rationale: open lists create gentle Zeigarnik tension; the check-out
 * delivers a discrete completion reward; the streak makes returning worthwhile.
 */
import { advanceStreak } from './streak';
import { dayKey, weekdayOf, endOfWeekKey, endOfMonthKey } from './dates';
import type { BucketColorId } from './buckets';

export interface ChecklistItem {
  id: string;
  label: string;
  /**
   * Optional link to a real activity. The tick is ALWAYS the checklist's own
   * state (per list, independent of other lists) — but on a today-scoped list,
   * checking a linked item also completes the real habit (streak/XP/group/goal/
   * project). Text-only items just omit it.
   */
  questId?: string;
}

export interface Checklist {
  id: string;
  title: string;
  emoji: string;
  colorId: BucketColorId;
  items: ChecklistItem[];
  /** Recurring lists reset daily; one-off lists archive on check-out. */
  recurring: boolean;
  createdAt: number;
  order: number;
  /** Items ticked for the current day (`checkedDay`). */
  checkedItemIds: string[];
  /** The local day (YYYY-MM-DD) the current ticks belong to. */
  checkedDay?: string;
  /** Local day of the last check-out (drives the streak). */
  lastCheckoutDate?: string;
  /** Consecutive-day check-out streak. */
  checkoutStreak: number;
  archived?: boolean;
  /** Day this list is bound to (YYYY-MM-DD). Absent = routine/undated (today-scoped). */
  date?: string;
  /**
   * Weekly recurrence: weekday numbers (0 = Sun … 6 = Sat) the list appears on.
   * Absent + recurring = every day (legacy/back-compat). Ignored when `date` is set.
   */
  scheduledDays?: number[];
  /** Optional recurrence window (YYYY-MM-DD, inclusive) for finite ranges. */
  startDate?: string;
  endDate?: string;
  /** Optional scope — the list belongs to a goal / group (bucket) / project. */
  goalId?: string;
  bucketId?: string;
  projectId?: string;
}

/**
 * Each item's tick is the checklist's OWN state — independent of other lists and
 * of the habit's global completion. (A today-scoped list separately completes the
 * real habit when a linked item is ticked; that side-effect lives in the screen.)
 */
export function isItemDone(item: ChecklistItem, checkedItemIds: readonly string[]): boolean {
  return checkedItemIds.includes(item.id);
}

/** The scheduling choices offered when creating a checklist. */
export type ChecklistScopeKind =
  | 'day' // just the selected day (one-off)
  | 'everyday'
  | 'weekdays' // Mon–Fri
  | 'weekends' // Sat + Sun
  | 'restOfWeek' // selected day → end of that week
  | 'month' // selected day → end of that month
  | 'pick'; // explicit weekday set

/** The persisted fields a scope maps to (fed straight into addChecklist). */
export interface ChecklistScope {
  recurring: boolean;
  date?: string;
  scheduledDays?: number[];
  startDate?: string;
  endDate?: string;
}

/** Translate a scope choice (relative to `selectedDay`) into checklist fields. Pure. */
export function buildChecklistScope(
  kind: ChecklistScopeKind,
  selectedDay: string,
  pickedDays: readonly number[] = [],
): ChecklistScope {
  switch (kind) {
    case 'day':
      return { recurring: false, date: selectedDay };
    case 'everyday':
      return { recurring: true, scheduledDays: [0, 1, 2, 3, 4, 5, 6] };
    case 'weekdays':
      return { recurring: true, scheduledDays: [1, 2, 3, 4, 5] };
    case 'weekends':
      return { recurring: true, scheduledDays: [0, 6] };
    case 'restOfWeek':
      return { recurring: true, scheduledDays: [0, 1, 2, 3, 4, 5, 6], startDate: selectedDay, endDate: endOfWeekKey(selectedDay) };
    case 'month':
      return { recurring: true, scheduledDays: [0, 1, 2, 3, 4, 5, 6], startDate: selectedDay, endDate: endOfMonthKey(selectedDay) };
    case 'pick': {
      const days = [...new Set(pickedDays.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
      return { recurring: true, scheduledDays: days.length ? days : [weekdayOf(selectedDay)] };
    }
  }
}

/**
 * Does a checklist appear on a given day?
 *  - dated one-off  → only its exact day;
 *  - else bounded by startDate/endDate when present;
 *  - else weekly recurrence via scheduledDays;
 *  - else legacy recurring/undated → every day.
 */
export function checklistShowsOn(c: Checklist, day: string): boolean {
  if (c.date) return c.date === day;
  if (c.startDate && day < c.startDate) return false;
  if (c.endDate && day > c.endDate) return false;
  if (c.scheduledDays && c.scheduledDays.length > 0) {
    return c.scheduledDays.includes(weekdayOf(day));
  }
  return true;
}

/** Where a checklist sits relative to today. Routine/undated lists are always 'today'. */
export function checklistDayState(c: Checklist, today: string): 'today' | 'past' | 'future' {
  if (!c.date || c.date === today) return 'today';
  return c.date < today ? 'past' : 'future';
}

export interface ChecklistProgress {
  done: number;
  total: number;
  pct: number;
  complete: boolean;
}

export function checklistProgress(c: Checklist): ChecklistProgress {
  const total = c.items.length;
  const valid = new Set(c.items.map((i) => i.id));
  const done = c.checkedItemIds.filter((id) => valid.has(id)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: total > 0 && done >= total };
}

/**
 * Reset daily ticks for ROUTINE lists (recurring, undated) when the stored
 * check-day isn't today. Dated lists keep their ticks (a record for that day).
 */
export function rolloverChecklist(c: Checklist, today: string): Checklist {
  if (!c.recurring || c.date) return c;
  if (c.checkedDay === today) return c;
  if (c.checkedItemIds.length === 0 && c.checkedDay === undefined) return c;
  return { ...c, checkedItemIds: [], checkedDay: today };
}

/** Toggle one item's tick for today (rolls the list over to today first). */
export function toggleChecklistItem(c: Checklist, itemId: string, today: string): Checklist {
  const rolled = rolloverChecklist(c, today);
  const has = rolled.checkedItemIds.includes(itemId);
  const checkedItemIds = has
    ? rolled.checkedItemIds.filter((i) => i !== itemId)
    : [...rolled.checkedItemIds, itemId];
  return { ...rolled, checkedItemIds, checkedDay: today };
}

export interface CheckoutResult {
  checklist: Checklist;
  streak: number;
  /** True when the list was already checked out earlier today (no-op). */
  alreadyDoneToday: boolean;
}

/** Close out a checklist for the day: bump the streak; recurring resets, one-off archives. */
export function checkOutChecklist(c: Checklist, now: Date): CheckoutResult {
  const today = dayKey(now);
  if (c.lastCheckoutDate === today) {
    return { checklist: c, streak: c.checkoutStreak, alreadyDoneToday: true };
  }
  const upd = advanceStreak(
    { streakDays: c.checkoutStreak, ...(c.lastCheckoutDate ? { lastCompletionDate: c.lastCheckoutDate } : {}) },
    now,
  );
  const next: Checklist = {
    ...c,
    lastCheckoutDate: today,
    checkoutStreak: upd.streakDays,
    // Routine lists reset for tomorrow; a dated list stays as that day's record;
    // an undated one-off archives.
    ...(c.recurring ? { checkedItemIds: [], checkedDay: today } : c.date ? {} : { archived: true }),
  };
  return { checklist: next, streak: upd.streakDays, alreadyDoneToday: false };
}
