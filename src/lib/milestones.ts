/**
 * Pure milestone detection — the celebration moments that mark a habit
 * solidifying or a goal getting stronger. Given the post-completion world plus
 * the set of already-earned ids, return only the NEW milestones to celebrate.
 * No I/O; idempotent against `earnedIds`.
 */
import { CAPACITIES, getCapacity, type CapacityId, type CapacityLevels } from './compounding';
import { SOLIDIFY_DAYS } from './activityStreak';
import type { BucketColorId } from './buckets';
import type { Goal } from './goal';

export type MilestoneKind =
  | 'streak'
  | 'activity_solid'
  | 'capacity_full'
  | 'goal'
  /** A community-project contribution beat ("+3 sites → Fort-Liberté"). */
  | 'project'
  /** The team crossed this week's project goal — the shared-win moment. */
  | 'project_goal';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  label: string;
  earnedAt: number;
  /** Optional override emoji (else a per-kind default is used). */
  emoji?: string;
  /** A second, smaller line under the label (e.g. "63% of this week's goal"). */
  detail?: string;
  /** Palette colour for the accent/progress bar (projects use their colour). */
  accentColorId?: BucketColorId;
  /** 0..100 — when present, the celebration shows a thin progress bar. */
  progressPct?: number;
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

// --- Project contribution beats ---------------------------------------------

/** One project's outcome from a completion — the celebratable shape. */
export interface ProjectBeat {
  projectId: string;
  title: string;
  emoji: string;
  unit: string;
  value: number;
  colorId: BucketColorId;
  /** Cycle progress after this contribution (0..100). */
  pct: number;
  reachedGoal: boolean;
  reward?: string;
  /** 'onsite' shows a 📍 cue in the beat. */
  mode?: 'onsite' | 'remote';
}

/**
 * Turn project contributions into transient celebration milestones — the
 * dopamine beat that ties a personal completion to collective progress. These
 * are NOT persisted/deduped (they fire every time); `reachedGoal` is the
 * once-per-cycle team-win. Pure: ids are derived from `now` + index.
 */
export function projectBeats(beats: readonly ProjectBeat[], now: number): Milestone[] {
  return beats.map((b, i) =>
    b.reachedGoal
      ? {
          id: `project_goal-${b.projectId}-${now}-${i}`,
          kind: 'project_goal',
          emoji: '🏆',
          label: `${b.title} hit this week’s goal!`,
          detail: b.reward ? `Reward unlocked: ${b.reward}` : 'Goal reached together',
          accentColorId: 'gold',
          progressPct: 100,
          earnedAt: now,
        }
      : {
          id: `project-${b.projectId}-${now}-${i}`,
          kind: 'project',
          emoji: b.emoji,
          label: `+${b.value} ${b.unit} → ${b.title}${b.mode === 'onsite' ? ' 📍' : ''}`,
          detail: `${b.mode === 'onsite' ? 'On-site · ' : ''}${b.pct}% of this week’s goal`,
          accentColorId: b.colorId,
          progressPct: b.pct,
          earnedAt: now,
        },
  );
}
