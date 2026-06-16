/**
 * Pure helpers for the Schedule calendar — what's on a given day and how to
 * colour-code it by activity type. A day's "scheduled" set is the explicit plan
 * when one exists, otherwise the habits that recur on that weekday (mirroring how
 * the home falls back). Colours come from CATEGORY_COLOR. No I/O.
 */
import { CATEGORY_COLOR, CATEGORY_ORDER } from './categories';
import { weekdayOfKey } from './recurrence';
import type { Quest, QuestCategory } from '@/types';

export interface DaySchedule {
  /** Habits scheduled that day (plan if set, else weekday recurrence). */
  scheduled: Quest[];
  /** Of those, the ids actually completed that day. */
  doneIds: Set<string>;
  /** Distinct categories present (scheduled or done), in canonical order. */
  categories: QuestCategory[];
  /** Total scheduled count (for intensity). */
  count: number;
  /** Completed count (for the year heat). */
  doneCount: number;
}

/** What's scheduled (and done) on one day. `plan` is the day's plan ids, or undefined. */
export function daySchedule(
  dayKey: string,
  quests: readonly Quest[],
  plan: readonly string[] | undefined,
  doneIds: ReadonlySet<string>,
): DaySchedule {
  const byId = new Map(quests.map((q) => [q.id, q]));
  const scheduled: Quest[] =
    plan !== undefined
      ? plan.map((id) => byId.get(id)).filter((q): q is Quest => q !== undefined)
      : quests.filter((q) => q.scheduledDays?.includes(weekdayOfKey(dayKey)));

  const done = new Set<string>();
  for (const q of scheduled) if (doneIds.has(q.id)) done.add(q.id);

  const present = new Set<QuestCategory>(scheduled.map((q) => q.category));
  // Include categories of things done that day even if not in the scheduled set.
  for (const q of quests) if (doneIds.has(q.id)) present.add(q.category);

  return {
    scheduled,
    doneIds: done,
    categories: CATEGORY_ORDER.filter((c) => present.has(c)),
    count: scheduled.length,
    doneCount: done.size,
  };
}

/** Top category colours for a day's dots (most informative first, capped). */
export function dayCategoryColors(categories: readonly QuestCategory[], max = 3): string[] {
  return categories.slice(0, max).map((c) => CATEGORY_COLOR[c]);
}

/** The dominant (first) category colour for a day, or undefined when empty. */
export function dominantColor(categories: readonly QuestCategory[]): string | undefined {
  return categories[0] ? CATEGORY_COLOR[categories[0]] : undefined;
}
