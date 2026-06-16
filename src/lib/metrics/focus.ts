/**
 * Focus recommendations — turns the adherence/capacity picture into a short,
 * ranked list of "do this next" cards, each carrying a concrete `InsightAction`
 * (plan / do / schedule / focus). This is what makes insights actionable: every
 * recommendation is a tappable command, not just an observation.
 *
 * Pure, no I/O.
 */
import { CAPACITIES, getCapacity, type CapacityId, type CapacityLevels } from '../compounding';
import { habitsForCapacity } from '../plan';
import { weekdayLabel } from '../analytics';
import type { Quest } from '@/types';
import type { GroupStat, InsightAction } from './types';

export interface FocusRec {
  id: string;
  /** Short headline, e.g. "Wednesdays are your gap". */
  title: string;
  /** One-line rationale. */
  reason: string;
  /** 0–1, higher = more urgent (drives ordering). */
  severity: number;
  /** The CTA — what tapping the card does. */
  action: InsightAction;
}

export interface FocusInput {
  /** Adherence summaries (any mix of habit/goal/bucket/capacity stats). */
  stats: readonly GroupStat[];
  levels: CapacityLevels;
  quests: readonly Quest[];
  /** Today's day key, for plan/schedule targets. */
  todayKey: string;
  limit?: number;
}

const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The lowest-level capacity that has at least one habit feeding it → a "do" CTA. */
function laggingCapacityRec(input: FocusInput): FocusRec | null {
  const ranked = [...CAPACITIES]
    .map((c) => ({ id: c.id as CapacityId, level: input.levels[c.id] ?? 0 }))
    .sort((a, b) => a.level - b.level);
  for (const { id, level } of ranked) {
    if (level >= 60) break; // healthy enough; nothing to flag
    const habit = habitsForCapacity(input.quests, id)[0];
    if (!habit) continue;
    const cap = getCapacity(id);
    return {
      id: `cap:${id}`,
      title: `${cap.name} is lagging`,
      reason: `It's your lowest capacity. "${habit.title}" builds it fastest.`,
      severity: 0.5 + (1 - level / 100) * 0.5,
      action: { label: `Do "${habit.title}"`, kind: 'do', target: { questId: habit.id, capacityId: id } },
    };
  }
  return null;
}

/** The worst-adhering goal or bucket with something scheduled → a "focus" CTA. */
function laggingGroupRec(input: FocusInput): FocusRec | null {
  const groups = input.stats
    .filter((s) => (s.kind === 'goal' || s.kind === 'bucket') && s.scheduled > 0)
    .sort((a, b) => a.adherencePct - b.adherencePct);
  const worst = groups[0];
  if (!worst || worst.adherencePct >= 70) return null;
  const target = worst.kind === 'goal' ? { goalId: worst.id } : { bucketId: worst.id };
  return {
    id: `grp:${worst.id}`,
    title: `${worst.label} is slipping`,
    reason: `${worst.adherencePct}% of what you scheduled got done.`,
    severity: 0.4 + (1 - worst.adherencePct / 100) * 0.4,
    action: { label: `Focus ${worst.label}`, kind: 'focus', target },
  };
}

/** The weekday most often missed across habits → a "schedule" CTA. */
function gapWeekdayRec(input: FocusInput): FocusRec | null {
  const misses = new Array(7).fill(0) as number[];
  for (const s of input.stats) {
    if (s.kind !== 'habit') continue;
    // Rank-weighted: the worst weekday for a habit counts most.
    s.gapWeekdays.forEach((wd, i) => {
      misses[wd] = (misses[wd] ?? 0) + (s.gapWeekdays.length - i);
    });
  }
  let worst = -1;
  let worstVal = 0;
  misses.forEach((v, i) => {
    if (v > worstVal) {
      worstVal = v;
      worst = i;
    }
  });
  if (worst < 0) return null;
  return {
    id: `wd:${worst}`,
    title: `${WEEKDAY_FULL[worst]}s are your gap`,
    reason: `That's the weekday you miss most. Plan it deliberately.`,
    severity: 0.45,
    action: { label: `Plan ${weekdayLabel(worst)}`, kind: 'schedule', target: { weekday: worst } },
  };
}

/** Ranked, deduped focus recommendations (most urgent first). */
export function focusRecommendations(input: FocusInput): FocusRec[] {
  const recs = [laggingCapacityRec(input), laggingGroupRec(input), gapWeekdayRec(input)].filter(
    (r): r is FocusRec => r !== null,
  );
  return recs.sort((a, b) => b.severity - a.severity).slice(0, input.limit ?? 4);
}
