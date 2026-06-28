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
import { dayKey } from './dates';
import type { BucketColorId } from './buckets';

export interface ChecklistItem {
  id: string;
  label: string;
  /**
   * When set, this item IS a real activity: checking it completes the quest
   * (counts toward streak/XP/groups/goals/projects) and its "done today" state
   * derives from the quest, not from `checkedItemIds`. Text-only items omit it.
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
  /** Optional scope — the list belongs to a goal / group (bucket) / project. */
  goalId?: string;
  bucketId?: string;
  projectId?: string;
}

/**
 * Is an item "done today"? Linked items (with a questId) derive from the quest's
 * real completion (passed in as a Set of quest ids done today), so a tick on
 * Today and in the checklist stay in sync. Text-only items use `checkedItemIds`.
 */
export function isItemDone(
  item: ChecklistItem,
  checkedItemIds: readonly string[],
  doneQuestIds: ReadonlySet<string>,
): boolean {
  return item.questId ? doneQuestIds.has(item.questId) : checkedItemIds.includes(item.id);
}

export interface ChecklistProgress {
  done: number;
  total: number;
  pct: number;
  complete: boolean;
}

export function checklistProgress(c: Checklist, doneQuestIds: ReadonlySet<string> = new Set()): ChecklistProgress {
  const total = c.items.length;
  const done = c.items.filter((it) => isItemDone(it, c.checkedItemIds, doneQuestIds)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, complete: total > 0 && done >= total };
}

/** Reset daily ticks when the stored check-day isn't today (keeps recurring lists fresh). */
export function rolloverChecklist(c: Checklist, today: string): Checklist {
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
    ...(c.recurring ? { checkedItemIds: [], checkedDay: today } : { archived: true }),
  };
  return { checklist: next, streak: upd.streakDays, alreadyDoneToday: false };
}
