/**
 * Life goals — the "why" that habits ladder up to (e.g. "Lose weight for the
 * wedding", "Be a better partner"). A goal links to life areas (categories); the
 * habits in those areas contribute to it. Progress is PROCESS-FIRST and honest —
 * derived only from real completions, plan, and capacity levels. No scale/outcome
 * numbers. Pure, no I/O.
 */
import { CATEGORY_CAPACITY_WEIGHTS } from './habitCapacity';
import { getBucketColor, type BucketColor, type BucketColorId } from './buckets';
import { resolveCategory } from './categories';
import { dayKey } from './dates';
import type { CapacityId, CapacityLevels } from './compounding';
import type { Quest, QuestCategory } from '@/types';

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  /** One of the shared on-brand palette colours (gold reserved for rewards). */
  colorId: BucketColorId;
  /** The life areas this goal draws on; habits in these categories contribute. */
  categories: QuestCategory[];
  createdAt: number;
  order: number;
}

/** Colours a goal may use — the shared palette minus gold (kept for 100%/reward). */
export const GOAL_COLOR_IDS: readonly BucketColorId[] = ['violet', 'teal', 'rose', 'sky', 'lime', 'slate'];

/** Resolve a goal's accent/soft colours from its colorId (palette-safe). */
export function goalColor(goal: Pick<Goal, 'colorId'>): BucketColor {
  return getBucketColor(goal.colorId);
}

export interface GoalProgress {
  /** Contributing habits completed today. */
  doneTodayInGoal: number;
  /** Contributing habits planned for today. */
  plannedTodayInGoal: number;
  /** Total habits that feed this goal. */
  contributingCount: number;
  /** Distinct days in the last 7 with a contributing completion (0..7). */
  weeklyDays: number;
  /** weeklyDays / 7, as a 0-100 percentage. */
  weeklyConsistencyPct: number;
  /** Mean level (0-100) of the capacities this goal's areas build. */
  capacityAvg: number;
}

/** The unique capacities the given life areas build (via the category→capacity map). */
export function capacitiesForCategories(categories: readonly QuestCategory[]): CapacityId[] {
  const seen = new Set<CapacityId>();
  for (const c of categories) {
    for (const link of CATEGORY_CAPACITY_WEIGHTS[c]) seen.add(link.capacityId);
  }
  return [...seen];
}

/**
 * The habits that contribute to a goal — those in its life areas, PLUS any
 * explicitly tagged into it (`linkedIds`, from goalLinks). Explicit membership
 * lets a single habit belong to several goals regardless of its category.
 */
export function goalHabits(
  quests: readonly Quest[],
  goal: Pick<Goal, 'categories'>,
  linkedIds?: ReadonlySet<string>,
): Quest[] {
  const areas = new Set(goal.categories);
  return quests.filter((q) => areas.has(q.category) || (linkedIds?.has(q.id) ?? false));
}

/**
 * Distinct days in the given week-window with a session in one of the goal's
 * life areas. Sessions without a category are ignored (no false attribution).
 */
export function goalWeeklyDays(
  sessions: readonly { category?: string; createdAt: number }[],
  goal: Pick<Goal, 'categories'>,
  weekDays: readonly string[],
): number {
  const areas = new Set(goal.categories);
  const week = new Set(weekDays);
  const hit = new Set<string>();
  for (const s of sessions) {
    if (!s.category || !areas.has(resolveCategory(s.category))) continue;
    const d = dayKey(new Date(s.createdAt));
    if (week.has(d)) hit.add(d);
  }
  return hit.size;
}

/** Honest, process-first progress for a goal. `weeklyDays` comes from real sessions. */
export function goalProgress(args: {
  goal: Goal;
  quests: readonly Quest[];
  plannedTodayIds?: readonly string[];
  levels: CapacityLevels;
  weeklyDays: number;
  /** Habit ids explicitly tagged into this goal (from goalLinks). */
  linkedIds?: ReadonlySet<string>;
}): GoalProgress {
  const { goal, quests, plannedTodayIds, levels, weeklyDays, linkedIds } = args;
  const contributing = goalHabits(quests, goal, linkedIds);
  const plannedSet = plannedTodayIds ? new Set(plannedTodayIds) : null;
  const isPlanned = (id: string) => (plannedSet ? plannedSet.has(id) : true); // no plan → all count

  const doneTodayInGoal = contributing.filter((q) => q.completed).length;
  const plannedTodayInGoal = contributing.filter((q) => isPlanned(q.id)).length;

  const caps = capacitiesForCategories(goal.categories);
  const capacityAvg =
    caps.length === 0 ? 0 : Math.round(caps.reduce((sum, c) => sum + (levels[c] ?? 0), 0) / caps.length);

  const clampedWeek = Math.max(0, Math.min(7, weeklyDays));
  return {
    doneTodayInGoal,
    plannedTodayInGoal,
    contributingCount: contributing.length,
    weeklyDays: clampedWeek,
    weeklyConsistencyPct: Math.round((clampedWeek / 7) * 100),
    capacityAvg,
  };
}
