/**
 * Pure milestone detection — the celebration moments that mark a habit
 * solidifying or a goal getting stronger. Given the post-completion world plus
 * the set of already-earned ids, return only the NEW milestones to celebrate.
 * No I/O; idempotent against `earnedIds`.
 */
import type { TFunction } from 'i18next';
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
  /** Project context — when present, the celebration offers a "Share your win" action. */
  share?: ProjectShare;
  /**
   * Localization metadata for the label/detail. When present, a translator can
   * (re)build `label`/`detail` from the `milestonesContent` namespace — this is
   * how MilestonesContext localizes freshly-detected milestones via the i18n
   * singleton without re-running detection. Not persisted/needed after the label
   * is settled; absence means the label is already final.
   */
  i18n?: MilestoneI18n;
}

/** Translation keys + interpolation params for a milestone's label/detail. */
export interface MilestoneI18n {
  labelKey: string;
  labelParams?: Record<string, string | number>;
  detailKey?: string;
  detailParams?: Record<string, string | number>;
}

/** Enough context to share a completion to the project's members. */
export interface ProjectShare {
  projectId: string;
  projectTitle: string;
  habitTitle: string;
  value: number;
  mode?: 'onsite' | 'remote';
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

/**
 * Detect newly-earned milestones from a single completion. Order = play order.
 *
 * Optional-translator pattern: when `t` is provided, user-facing `label`/`detail`
 * strings are built from the `milestonesContent` namespace; when omitted, the
 * current English strings are returned verbatim (the source of truth + the
 * fallback that keeps pure unit tests deterministic). Because milestone labels
 * become persisted user data, translating them at detection time is intentional —
 * they are NOT re-derived later.
 */
export function detectMilestones(args: DetectArgs, t?: TFunction): Milestone[] {
  const { earnedIds, now } = args;
  const out: Milestone[] = [];
  const add = (id: string, kind: MilestoneKind, fallback: string, i18n: MilestoneI18n) => {
    if (earnedIds.has(id)) return;
    const label = t ? t(`milestonesContent:${i18n.labelKey}`, i18n.labelParams) : fallback;
    out.push({ id, kind, label, earnedAt: now, i18n });
  };

  // Global streak thresholds (fire each not-yet-earned threshold we've reached).
  for (const days of STREAK_THRESHOLDS) {
    if (args.streakDays >= days) {
      add(`streak-${days}`, 'streak', `${days}-day streak! 🔥`, {
        labelKey: 'streak',
        labelParams: { count: days },
      });
    }
  }

  // A habit "locks in" once it's been consistent for SOLIDIFY_DAYS.
  const solidified = args.activity.streakDays >= SOLIDIFY_DAYS;
  const solidId = `activity_solid-${args.activity.canonicalKey}`;
  const newlySolid = solidified && !earnedIds.has(solidId);
  if (solidified) {
    add(solidId, 'activity_solid', `“${args.activity.title}” is a habit now 🌱`, {
      labelKey: 'activitySolid',
      labelParams: { title: args.activity.title },
    });
  }

  // A capacity ring reaching 100% — only on the crossing.
  for (const cap of CAPACITIES) {
    const id = cap.id as CapacityId;
    if ((args.prevLevels[id] ?? 0) < 100 && (args.levels[id] ?? 0) >= 100) {
      const name = getCapacity(id).name;
      add(`capacity_full-${id}`, 'capacity_full', `${name} fully charged ✨`, {
        labelKey: 'capacityFull',
        labelParams: { name },
      });
    }
  }

  // When a contributing habit solidifies, each related goal gets stronger.
  if (newlySolid) {
    const contributing = new Set(args.contributingGoalIds);
    for (const goal of args.goals) {
      if (!contributing.has(goal.id)) continue;
      add(
        `goal-${goal.id}-solid-${args.activity.canonicalKey}`,
        'goal',
        `Your “${goal.title}” goal just got stronger ${goal.emoji}`,
        { labelKey: 'goalStronger', labelParams: { title: goal.title, emoji: goal.emoji } },
      );
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
  /** The habit just completed (for the "share your win" action). */
  habitTitle?: string;
}

/**
 * Turn project contributions into transient celebration milestones — the
 * dopamine beat that ties a personal completion to collective progress. These
 * are NOT persisted/deduped (they fire every time); `reachedGoal` is the
 * once-per-cycle team-win. Pure: ids are derived from `now` + index.
 */
export function projectBeats(beats: readonly ProjectBeat[], now: number, t?: TFunction): Milestone[] {
  return beats.map((b, i) => {
    const share: ProjectShare | undefined = b.habitTitle
      ? { projectId: b.projectId, projectTitle: b.title, habitTitle: b.habitTitle, value: b.value, mode: b.mode }
      : undefined;
    if (b.reachedGoal) {
      const i18n: MilestoneI18n = b.reward
        ? {
            labelKey: 'projectGoalLabel',
            labelParams: { title: b.title },
            detailKey: 'projectGoalRewardDetail',
            detailParams: { reward: b.reward },
          }
        : {
            labelKey: 'projectGoalLabel',
            labelParams: { title: b.title },
            detailKey: 'projectGoalDetail',
          };
      const label = t ? t(`milestonesContent:${i18n.labelKey}`, i18n.labelParams) : `${b.title} hit this week’s goal!`;
      const detail = t
        ? t(`milestonesContent:${i18n.detailKey}`, i18n.detailParams)
        : b.reward
          ? `Reward unlocked: ${b.reward}`
          : 'Goal reached together';
      return {
        id: `project_goal-${b.projectId}-${now}-${i}`,
        kind: 'project_goal',
        emoji: '🏆',
        label,
        detail,
        accentColorId: 'gold',
        progressPct: 100,
        earnedAt: now,
        i18n,
        ...(share ? { share } : {}),
      };
    }
    const onsite = b.mode === 'onsite';
    const pin = onsite ? ' 📍' : '';
    const prefix = onsite ? (t ? t('milestonesContent:onSitePrefix') : 'On-site · ') : '';
    const i18n: MilestoneI18n = {
      labelKey: 'projectLabel',
      labelParams: { value: b.value, unit: b.unit, title: b.title, pin },
      detailKey: 'projectDetail',
      detailParams: { prefix, pct: b.pct },
    };
    const label = t ? t(`milestonesContent:${i18n.labelKey}`, i18n.labelParams) : `+${b.value} ${b.unit} → ${b.title}${pin}`;
    const detail = t ? t(`milestonesContent:${i18n.detailKey}`, i18n.detailParams) : `${prefix}${b.pct}% of this week’s goal`;
    return {
      id: `project-${b.projectId}-${now}-${i}`,
      kind: 'project',
      emoji: b.emoji,
      label,
      detail,
      accentColorId: b.colorId,
      progressPct: b.pct,
      earnedAt: now,
      i18n,
      ...(share ? { share } : {}),
    };
  });
}

/**
 * Localize a milestone's `label`/`detail` from its `i18n` metadata using the
 * given translator (the i18n singleton). Used by MilestonesContext to translate
 * freshly-detected milestones whose detection ran without a translator. Returns
 * the milestone unchanged when no metadata is present (label already final).
 */
export function localizeMilestone(m: Milestone, t: TFunction): Milestone {
  if (!m.i18n) return m;
  const label = t(`milestonesContent:${m.i18n.labelKey}`, m.i18n.labelParams);
  // Strip the metadata once localized: the label/detail are now settled and must
  // not be re-derived (e.g. after persistence + reload under another language).
  const { i18n: _meta, ...rest } = m;
  const next: Milestone = { ...rest, label };
  if (_meta.detailKey) next.detail = t(`milestonesContent:${_meta.detailKey}`, _meta.detailParams);
  return next;
}

/** Localize many milestones (see localizeMilestone). */
export function localizeMilestones(ms: readonly Milestone[], t: TFunction): Milestone[] {
  return ms.map((m) => localizeMilestone(m, t));
}
