/**
 * Pure logic for the per-day plan — the curated, ordered set of habits the user
 * commits to for a day. The home reflects only the plan (so it stays glanceable),
 * and "yesterday's gaps" feed next-day planning. No I/O; fully unit-tested.
 *
 * A plan is a list of quest ids. `undefined` means "no plan set for this day" →
 * callers fall back to all habits so the app is usable before anyone curates.
 * An explicit `[]` means "planned nothing" and is respected as-is.
 */
import { dayProgress, type DayProgress } from './dashboard';
import { rippleForQuest } from './habitCapacity';
import { goalHabits, type Goal } from './goal';
import type { CapacityId } from './compounding';
import type { Quest } from '@/types';

/** The planned habits, in plan order. No plan → all habits (back-compat fallback). */
export function effectivePlan(quests: readonly Quest[], plannedIds?: readonly string[]): Quest[] {
  if (!plannedIds) return [...quests];
  const byId = new Map(quests.map((q) => [q.id, q]));
  return plannedIds.map((id) => byId.get(id)).filter((q): q is Quest => q !== undefined);
}

/**
 * Planned & still-open habits for "now", ordered by scheduled time (timed first,
 * ascending) then plan order — drives the home Now card + up-next strip.
 */
export function plannedOpen(quests: readonly Quest[], plannedIds?: readonly string[]): Quest[] {
  return effectivePlan(quests, plannedIds)
    .filter((q) => !q.completed)
    .sort((a, b) => {
      const at = a.scheduledTime;
      const bt = b.scheduledTime;
      if (at !== undefined && bt !== undefined) return at - bt;
      if (at !== undefined) return -1; // timed before untimed
      if (bt !== undefined) return 1;
      return 0; // both untimed → keep plan order (stable sort)
    });
}

/** Today's plan completion (live, from the derived `completed` flag) for the hero ring. */
export function planProgress(quests: readonly Quest[], plannedIds?: readonly string[]): DayProgress {
  return dayProgress(effectivePlan(quests, plannedIds));
}

/**
 * The focus pool governed by a goal: planned & still-open habits (same ordering
 * as `plannedOpen`) restricted to the goal's contributing activities. This is how
 * a selected goal drives the Dashboard's central focus.
 */
export function goalFocusPool(
  quests: readonly Quest[],
  plannedIds: readonly string[] | undefined,
  goal: Pick<Goal, 'categories'>,
): Quest[] {
  const inGoal = new Set(goalHabits(quests, goal).map((q) => q.id));
  return plannedOpen(quests, plannedIds).filter((q) => inGoal.has(q.id));
}

/** Today's completion within a goal's planned habits — the goal-scoped hero ring. */
export function goalDayProgress(
  quests: readonly Quest[],
  plannedIds: readonly string[] | undefined,
  goal: Pick<Goal, 'categories'>,
): DayProgress {
  const inGoal = new Set(goalHabits(quests, goal).map((q) => q.id));
  return dayProgress(effectivePlan(quests, plannedIds).filter((q) => inGoal.has(q.id)));
}

/**
 * Day-accurate plan completion: how many planned ids were actually done that day,
 * given the set of activity ids with a session that day (from analytics). Used by
 * the charted day review where the live `completed` flag (today-only) won't do.
 */
export function planProgressOn(plannedIds: readonly string[], doneIds: ReadonlySet<string>): DayProgress {
  const total = plannedIds.length;
  const done = plannedIds.filter((id) => doneIds.has(id)).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Planned habits NOT completed on the given day (its `doneIds`) — the carry-over gaps. */
export function gapsFor(
  quests: readonly Quest[],
  plannedIds: readonly string[] | undefined,
  doneIds: ReadonlySet<string>,
): Quest[] {
  return effectivePlan(quests, plannedIds).filter((q) => !doneIds.has(q.id));
}

/** Habits that strengthen a capacity (strongest first) — powers the capacity tap-through. */
export function habitsForCapacity(quests: readonly Quest[], capacityId: CapacityId): Quest[] {
  return quests
    .map((q) => {
      const delta = rippleForQuest(q).find((d) => d.capacityId === capacityId)?.delta ?? 0;
      return { q, delta };
    })
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .map((x) => x.q);
}
