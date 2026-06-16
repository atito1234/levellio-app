/**
 * Adherence engine — the backbone metric: scheduled occurrences vs. completed.
 *
 * "Scheduled" comes from a habit's weekly recurrence (`scheduledDays`) or, for
 * non-recurring habits, from explicit plan membership on each day. "Done" comes
 * from the captured session log. One occurrence-based engine powers both a single
 * habit and any aggregate (bucket / goal / capacity / category), so every level
 * of the Progress hub speaks the same language.
 *
 * Pure, no I/O — fully unit-tested.
 */
import { dayDiff, shiftDayKey } from '../dates';
import { sessionDay } from '../analytics';
import { weekdayOfKey } from '../recurrence';
import type { ActivitySessionEvent } from '../metadata';
import type { BucketColorId } from '../buckets';
import type { Quest } from '@/types';
import type { DayRange, GroupKind, GroupStat, MetricPoint } from './types';

/** Reads a day's planned quest ids (PlanContext's `getPlan`); undefined = no plan. */
export type GetPlan = (dayKey: string) => readonly string[] | undefined;

/** Inclusive list of day keys for a range, oldest → newest (capped at ~2 years). */
export function rangeKeys(range: DayRange): string[] {
  const span = dayDiff(range.start, range.end);
  if (span < 0) return [];
  const n = Math.min(span, 730);
  const out: string[] = [];
  for (let i = 0; i <= n; i += 1) out.push(shiftDayKey(range.start, i));
  return out;
}

/** A range of `lengthDays` ending on (and including) `endKey`. */
export function rangeEndingOn(endKey: string, lengthDays: number): DayRange {
  const len = Math.max(1, Math.floor(lengthDays));
  return { start: shiftDayKey(endKey, -(len - 1)), end: endKey };
}

/** The equal-length window immediately before `range` (for period-over-period delta). */
export function previousRange(range: DayRange): DayRange {
  const len = dayDiff(range.start, range.end) + 1;
  const end = shiftDayKey(range.start, -1);
  return { start: shiftDayKey(end, -(len - 1)), end };
}

/** Map of activityId → set of day keys it has at least one session on. */
export function doneDaysByActivity(sessions: readonly ActivitySessionEvent[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const s of sessions) {
    const set = map.get(s.activityId) ?? new Set<string>();
    set.add(sessionDay(s));
    if (!map.has(s.activityId)) map.set(s.activityId, set);
  }
  return map;
}

/** True if `quest` is scheduled on `day` — by weekly recurrence, else plan membership. */
function isScheduledOn(quest: Quest, day: string, getPlan: GetPlan): boolean {
  if (quest.scheduledDays && quest.scheduledDays.length > 0) {
    return quest.scheduledDays.includes(weekdayOfKey(day));
  }
  return !!getPlan(day)?.includes(quest.id);
}

interface Occurrence {
  dayKey: string;
  weekday: number;
  done: boolean;
}

/** Enumerate scheduled occurrences (with done flags) for a set of quests over a range. */
function occurrencesFor(
  quests: readonly Quest[],
  done: Map<string, Set<string>>,
  getPlan: GetPlan,
  keys: readonly string[],
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const day of keys) {
    const weekday = weekdayOfKey(day);
    for (const q of quests) {
      if (!isScheduledOn(q, day, getPlan)) continue;
      out.push({ dayKey: day, weekday, done: !!done.get(q.id)?.has(day) });
    }
  }
  return out;
}

function pct(done: number, scheduled: number): number {
  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
}

/** Adherence over occurrences, oldest week → newest (7-day buckets from range start). */
function weeklyAdherence(occ: readonly Occurrence[], keys: readonly string[]): number[] {
  if (keys.length === 0) return [];
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occ) (byDay.get(o.dayKey) ?? byDay.set(o.dayKey, []).get(o.dayKey)!).push(o);
  const weeks: number[] = [];
  for (let i = 0; i < keys.length; i += 7) {
    const chunk = keys.slice(i, i + 7);
    let s = 0;
    let d = 0;
    for (const day of chunk) {
      const list = byDay.get(day) ?? [];
      s += list.length;
      d += list.filter((o) => o.done).length;
    }
    if (s > 0) weeks.push(pct(d, s));
  }
  return weeks;
}

/** Weekday indices (0=Sun) ranked by missed scheduled occurrences, worst first. */
function gapWeekdaysOf(occ: readonly Occurrence[]): number[] {
  const misses = new Array(7).fill(0) as number[];
  for (const o of occ) if (!o.done) misses[o.weekday] = (misses[o.weekday] ?? 0) + 1;
  return misses
    .map((count, weekday) => ({ count, weekday }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((x) => x.weekday);
}

/** Trailing run of consecutive scheduled days fully completed (empty days skipped). */
function trailingStreak(occ: readonly Occurrence[], keys: readonly string[]): number {
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occ) (byDay.get(o.dayKey) ?? byDay.set(o.dayKey, []).get(o.dayKey)!).push(o);
  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    const list = byDay.get(keys[i]!);
    if (!list || list.length === 0) continue; // no scheduled occurrence → skip
    if (list.every((o) => o.done)) streak += 1;
    else break;
  }
  return streak;
}

export interface StatInput {
  id: string;
  kind: GroupKind;
  label: string;
  colorId?: BucketColorId;
  members: readonly Quest[];
  sessions: readonly ActivitySessionEvent[];
  getPlan: GetPlan;
  range: DayRange;
  /** Precomputed done-days map (pass to reuse across many stats). */
  done?: Map<string, Set<string>>;
}

/** Compute a full adherence summary for one habit or aggregate group. */
export function computeStat(input: StatInput): GroupStat {
  const done = input.done ?? doneDaysByActivity(input.sessions);
  const keys = rangeKeys(input.range);
  const occ = occurrencesFor(input.members, done, input.getPlan, keys);
  const scheduled = occ.length;
  const doneCount = occ.filter((o) => o.done).length;

  const prev = previousRange(input.range);
  const prevOcc = occurrencesFor(input.members, done, input.getPlan, rangeKeys(prev));
  const prevPct = pct(prevOcc.filter((o) => o.done).length, prevOcc.length);
  const curPct = pct(doneCount, scheduled);

  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    colorId: input.colorId,
    scheduled,
    done: doneCount,
    adherencePct: curPct,
    deltaPct: prevOcc.length === 0 ? 0 : curPct - prevPct,
    streak: trailingStreak(occ, keys),
    weekly: weeklyAdherence(occ, keys),
    gapWeekdays: gapWeekdaysOf(occ),
  };
}

/**
 * Dated weekly-adherence points (week-start dayKey → %), skipping weeks with no
 * scheduled occurrences. Feeds the adherence trend line.
 */
export function weeklyAdherencePoints(input: StatInput): MetricPoint[] {
  const done = input.done ?? doneDaysByActivity(input.sessions);
  const keys = rangeKeys(input.range);
  const occ = occurrencesFor(input.members, done, input.getPlan, keys);
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occ) (byDay.get(o.dayKey) ?? byDay.set(o.dayKey, []).get(o.dayKey)!).push(o);
  const pts: MetricPoint[] = [];
  for (let i = 0; i < keys.length; i += 7) {
    const chunk = keys.slice(i, i + 7);
    let s = 0;
    let d = 0;
    for (const day of chunk) {
      const list = byDay.get(day) ?? [];
      s += list.length;
      d += list.filter((o) => o.done).length;
    }
    if (s > 0) pts.push({ dayKey: chunk[0]!, value: pct(d, s) });
  }
  return pts;
}

/** Convenience: adherence summary for a single habit. */
export function habitStat(
  quest: Quest,
  sessions: readonly ActivitySessionEvent[],
  getPlan: GetPlan,
  range: DayRange,
  done?: Map<string, Set<string>>,
): GroupStat {
  return computeStat({
    id: quest.id,
    kind: 'habit',
    label: quest.title,
    members: [quest],
    sessions,
    getPlan,
    range,
    done,
  });
}
