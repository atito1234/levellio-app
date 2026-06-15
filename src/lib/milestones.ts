/**
 * Pure milestone detection — the celebration moments that mark a habit
 * solidifying or a goal getting stronger. Given the post-completion world plus
 * the set of already-earned ids, return only the NEW milestones to celebrate.
 * No I/O; idempotent against `earnedIds`.
 */
import { CAPACITIES, getCapacity, type CapacityId, type CapacityLevels } from './compounding';
import { SOLIDIFY_DAYS } from './activityStreak';
import type { Goal } from './goal';

export type MilestoneKind = 'streak' | 'activity_solid' | 'capacity_full' | 'goal';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  label: string;
  earnedAt: number;
}

/** Global daily-streak thresholds worth a celebration. */
export const STREAK_THRESHOLDS = [3, 7, 14, 30, 66] as const;

export interface DetectArgs {
  earnedIds: ReadonlySet<string>;
  now: number;
  /** Global daily streak (consecutive days completing any habit), post-completion. */
  streakDays: number;
  /** The activity just completed. */
  activity: { canonicalKey: string; title: string; streakDays: number };
  /** Capacity ring levels before and after this completion's ripple. */
  prevLevels: CapacityLevels;
  levels: CapacityLevels;
  /** All goals + which of them this activity contributes to. */
  goals: readonly Goal[];
  contributingGoalIds: readonly string[];
}

/** Detect newly-earned milestones from a single completion. Order = play order. */
export function detectMilestones(args: DetectArgs): Milestone[] {
  const { earnedIds, now } = args;
  const out: Milestone[] = [];
  const add = (id: string, kind: MilestoneKind, label: string) => {
    if (!earnedIds.has(id)) out.push({ id, kind, label, earnedAt: now });
  };

  // Global streak thresholds (fire each not-yet-earned threshold we've reached).
  for (const t of STREAK_THRESHOLDS) {
    if (args.streakDays >= t) add(`streak-${t}`, 'streak', `${t}-day streak! 🔥`);
  }

  // A habit "locks in" once it's been consistent for SOLIDIFY_DAYS.
  const solidified = args.activity.streakDays >= SOLIDIFY_DAYS;
  const solidId = `activity_solid-${args.activity.canonicalKey}`;
  const newlySolid = solidified && !earnedIds.has(solidId);
  if (solidified) add(solidId, 'activity_solid', `“${args.activity.title}” is a habit now 🌱`);

  // A capacity ring reaching 100% — only on the crossing.
  for (const cap of CAPACITIES) {
    const id = cap.id as CapacityId;
    if ((args.prevLevels[id] ?? 0) < 100 && (args.levels[id] ?? 0) >= 100) {
      add(`capacity_full-${id}`, 'capacity_full', `${getCapacity(id).name} fully charged ✨`);
    }
  }

  // When a contributing habit solidifies, each related goal gets stronger.
  if (newlySolid) {
    const contributing = new Set(args.contributingGoalIds);
    for (const goal of args.goals) {
      if (!contributing.has(goal.id)) continue;
      add(`goal-${goal.id}-solid-${args.activity.canonicalKey}`, 'goal', `Your “${goal.title}” goal just got stronger ${goal.emoji}`);
    }
  }

  return out;
}
