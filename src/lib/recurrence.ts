/**
 * Weekly recurrence helpers — pure, no I/O. A habit's `scheduledDays` lists the
 * weekday indices (0=Sun … 6=Sat) it repeats on. These compute which habits are
 * due on a given day and format the pattern for display.
 */
import type { Quest } from '@/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Local weekday (0=Sun … 6=Sat) for a `YYYY-MM-DD` key. */
export function weekdayOfKey(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay();
}

/** Ids of recurring habits due on the given weekday. */
export function recurringIdsForDay(quests: readonly Quest[], weekday: number): string[] {
  return quests.filter((q) => q.scheduledDays?.includes(weekday)).map((q) => q.id);
}

/** True if the habit recurs on the given day key. */
export function recursOn(quest: Quest, dayKey: string): boolean {
  return !!quest.scheduledDays?.includes(weekdayOfKey(dayKey));
}

/**
 * Pure reducer for once-per-day materialization. Given the current plans, the set
 * of already-materialized days, and per-day recurring ids, returns the next plans
 * + markers — or null when there's nothing to do. Days with no ids are skipped
 * (so the "no plan → show all" fallback is preserved) and already-materialized
 * days are left untouched (so user removals stick).
 */
export function materializeInto(
  plans: Record<string, string[]>,
  materialized: readonly string[],
  entries: readonly { dayKey: string; ids: string[] }[],
): { days: Record<string, string[]>; materialized: string[] } | null {
  const todo = entries.filter((e) => e.ids.length > 0 && !materialized.includes(e.dayKey));
  if (todo.length === 0) return null;
  const days = { ...plans };
  for (const { dayKey, ids } of todo) {
    days[dayKey] = [...new Set([...(days[dayKey] ?? []), ...ids])];
  }
  return { days, materialized: [...materialized, ...todo.map((e) => e.dayKey)] };
}

/** Human label for a recurrence pattern: "Every day" / "Weekdays" / "Mon · Wed · Fri". */
export function weekdaysLabel(days: readonly number[] | undefined): string {
  const set = [...new Set((days ?? []).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  if (set.length === 0) return '';
  if (set.length === 7) return 'Every day';
  if (set.length === 5 && [1, 2, 3, 4, 5].every((d) => set.includes(d))) return 'Weekdays';
  if (set.length === 2 && set.includes(0) && set.includes(6)) return 'Weekends';
  return set.map((d) => DAY_NAMES[d]).join(' · ');
}
