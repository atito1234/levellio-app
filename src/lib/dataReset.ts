/**
 * Pure logic for the Settings "danger zone" — scoped deletion of schedule/data.
 *
 * Scope: `weekdays === undefined` means ALL days; a list means only those
 * weekdays (0=Sun … 6=Sat). All functions are pure and return what to change, so
 * the destructive side-effects (persisting) stay in the caller and stay testable.
 */
import { weekdayOfKey } from './recurrence';
import type { PlanDays } from '@/services/plan';
import type { Quest } from '@/types';

/** True when a weekday is in scope (undefined scope = every day). */
export function inScope(weekday: number, weekdays?: readonly number[]): boolean {
  return weekdays === undefined ? true : weekdays.includes(weekday);
}

/** Plans with in-scope days removed. ALL scope → `{}`. */
export function clearPlanDays(plans: PlanDays, weekdays?: readonly number[]): PlanDays {
  if (weekdays === undefined) return {};
  const next: PlanDays = {};
  for (const [day, ids] of Object.entries(plans)) {
    if (!inScope(weekdayOfKey(day), weekdays)) next[day] = ids;
  }
  return next;
}

/** Day keys that will be dropped by `clearPlanDays` (for trimming materialized marks). */
export function clearedPlanDayKeys(plans: PlanDays, weekdays?: readonly number[]): string[] {
  return Object.keys(plans).filter((day) => inScope(weekdayOfKey(day), weekdays));
}

/**
 * Recurrence edits to strip in-scope weekdays from every habit. ALL scope wipes
 * recurrence entirely. Returns only the quests that actually change.
 */
export function stripRecurrence(
  quests: readonly Quest[],
  weekdays?: readonly number[],
): { id: string; scheduledDays: number[] }[] {
  const edits: { id: string; scheduledDays: number[] }[] = [];
  for (const q of quests) {
    const days = q.scheduledDays ?? [];
    if (days.length === 0) continue;
    const kept = weekdays === undefined ? [] : days.filter((d) => !weekdays.includes(d));
    if (kept.length !== days.length) edits.push({ id: q.id, scheduledDays: kept });
  }
  return edits;
}

/**
 * Quest ids in scope for a full delete: ALL scope → every quest; otherwise any
 * quest that recurs on an in-scope weekday OR is planned on an in-scope day.
 */
export function questIdsForScope(
  quests: readonly Quest[],
  plans: PlanDays,
  weekdays?: readonly number[],
): Set<string> {
  if (weekdays === undefined) return new Set(quests.map((q) => q.id));
  const ids = new Set<string>();
  for (const q of quests) {
    if ((q.scheduledDays ?? []).some((d) => weekdays.includes(d))) ids.add(q.id);
  }
  for (const [day, planIds] of Object.entries(plans)) {
    if (inScope(weekdayOfKey(day), weekdays)) for (const id of planIds) ids.add(id);
  }
  return ids;
}
