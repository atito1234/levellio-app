/**
 * Pure helpers for the ring-first home ("Today billboard"). No I/O, fully
 * unit-tested. The home screen composes these over the REAL game/bucket state.
 */
import type { HabitBucket } from '@/lib/buckets';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { Quest } from '@/types';

/** The single habit to feature: the first still-open one, or null when all done. */
export function pickFocusHabit(quests: readonly Quest[]): Quest | null {
  return quests.find((q) => !q.completed) ?? null;
}

export interface DayProgress {
  done: number;
  total: number;
  /** 0-100, rounded. 0 when there are no habits. */
  pct: number;
}

/** Today's real completion across binary habits — the meaningful hero ring. */
export function dayProgress(quests: readonly Quest[]): DayProgress {
  const total = quests.length;
  const done = quests.filter((q) => q.completed).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export type RailSource = 'bucket' | 'unfiled' | 'category';

export interface HabitRail {
  id: string;
  label: string;
  source: RailSource;
  /** Bucket id, category id, or 'unfiled'. */
  sourceId: string;
  habits: Quest[];
}

/**
 * Move a habit to be the next focus — placed immediately after the current
 * first open habit, so it comes up right after you finish the current one.
 * Pure; returns the same reference when it's already first (no-op).
 */
export function prioritizeAfterFirstOpen(quests: readonly Quest[], questId: string): Quest[] {
  const firstOpen = quests.findIndex((q) => !q.completed);
  const targetIdx = quests.findIndex((q) => q.id === questId);
  if (firstOpen < 0 || targetIdx < 0 || targetIdx === firstOpen) return quests as Quest[];
  const arr = [...quests];
  const [target] = arr.splice(targetIdx, 1);
  // target is open and not the first open, so targetIdx > firstOpen — firstOpen's
  // position is unchanged after the splice; insert right after it.
  arr.splice(firstOpen + 1, 0, target!);
  return arr;
}

function leadWithOpen(habits: Quest[]): Quest[] {
  return [...habits].sort((a, b) => Number(a.completed) - Number(b.completed));
}

/**
 * Group habits into horizontal rails. Prefers the user's REAL Day-12 buckets;
 * falls back to the existing category grouping when no buckets exist. Only
 * non-empty rails are returned (cognitive-load reduction).
 */
export function groupHabitsIntoRails(
  quests: readonly Quest[],
  buckets: readonly HabitBucket[],
  assignments: Readonly<Record<string, string>>,
): HabitRail[] {
  const rails: HabitRail[] = [];

  if (buckets.length > 0) {
    const validIds = new Set(buckets.map((b) => b.id));
    for (const bucket of [...buckets].sort((a, b) => a.order - b.order)) {
      const habits = quests.filter((q) => assignments[q.id] === bucket.id);
      if (habits.length > 0) {
        rails.push({ id: bucket.id, label: bucket.name, source: 'bucket', sourceId: bucket.id, habits: leadWithOpen(habits) });
      }
    }
    const unfiled = quests.filter((q) => {
      const a = assignments[q.id];
      return !a || !validIds.has(a);
    });
    if (unfiled.length > 0) {
      rails.push({ id: 'unfiled', label: 'Unfiled', source: 'unfiled', sourceId: 'unfiled', habits: leadWithOpen(unfiled) });
    }
    return rails;
  }

  // No buckets yet → group by category.
  for (const category of CATEGORY_ORDER) {
    const habits = quests.filter((q) => q.category === category);
    if (habits.length > 0) {
      rails.push({
        id: category,
        label: CATEGORY_META[category].label,
        source: 'category',
        sourceId: category,
        habits: leadWithOpen(habits),
      });
    }
  }
  return rails;
}
