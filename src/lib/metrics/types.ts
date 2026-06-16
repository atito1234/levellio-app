/**
 * Metric layer types — the sensor-ready spine every analytics chart consumes.
 *
 * A `MetricSeries` is a labelled, dated stream of values tagged with its
 * provenance (`source`) and how much we trust it yet (`confidence`). Today's
 * series are `derived` (modelled from completions) or `self-report` (ratings);
 * future device metrics (HR, sleep, steps) arrive as `sensor` series with the
 * exact same shape, so charts need no rework when real adapters land.
 *
 * Pure types only — no I/O.
 */
import type { BucketColorId } from '../buckets';
import type { CapacityId } from '../compounding';

/** Where a metric's values come from. Drives honest "derived vs measured" labels. */
export type MetricSource = 'derived' | 'self-report' | 'sensor';

/** A single dated sample (`value` in the series' own unit). */
export interface MetricPoint {
  dayKey: string;
  value: number;
}

/** How much data backs a metric — replaces the old time-locked gating. */
export type Confidence = 'low' | 'medium' | 'high';

/** A labelled, dated stream of values with provenance + confidence. */
export interface MetricSeries {
  id: string;
  label: string;
  /** Display unit (e.g. "%", "min", "bpm"); omit for unitless counts. */
  unit?: string;
  source: MetricSource;
  /** Palette colour for charting (gold reserved for 100%/reward). */
  colorId?: BucketColorId;
  points: MetricPoint[];
  confidence: Confidence;
}

/** What a `GroupStat` summarizes — the axes the Progress hub categorizes by. */
export type GroupKind = 'habit' | 'bucket' | 'goal' | 'capacity' | 'category';

/**
 * Adherence-centric summary for one group (a habit, or an aggregate over a
 * bucket/goal/capacity/category). The backbone of the Progress hub: scheduled vs
 * done, the period-over-period delta, current streak, a weekly trend, and which
 * weekdays the gaps cluster on.
 */
export interface GroupStat {
  id: string;
  kind: GroupKind;
  label: string;
  colorId?: BucketColorId;
  /** Scheduled occurrences in the window (from recurrence or plan membership). */
  scheduled: number;
  /** Scheduled occurrences that were actually completed. */
  done: number;
  /** done / scheduled as 0–100 (0 when nothing was scheduled). */
  adherencePct: number;
  /** This window's adherence minus the previous equal-length window (−100..100). */
  deltaPct: number;
  /** Trailing run of consecutive scheduled days completed (non-scheduled skipped). */
  streak: number;
  /** Per-week adherence %, oldest → newest, for the trend line. */
  weekly: number[];
  /** Weekday indices (0=Sun) ranked by missed scheduled occurrences, worst first. */
  gapWeekdays: number[];
}

/** What an insight's CTA does when tapped — the "connected to actions" contract. */
export type InsightActionKind = 'plan' | 'do' | 'edit' | 'schedule' | 'focus';

/** A tappable command carried by charts, focus cards, and insight rows. */
export interface InsightAction {
  label: string;
  kind: InsightActionKind;
  target: InsightActionTarget;
}

/** Where an action points; fields are populated per `kind`. */
export interface InsightActionTarget {
  questId?: string;
  goalId?: string;
  bucketId?: string;
  capacityId?: CapacityId;
  /** Day to plan/review (YYYY-MM-DD). */
  dayKey?: string;
  /** Weekday to schedule on (0=Sun … 6=Sat). */
  weekday?: number;
}

/** An inclusive range of local day keys (`start` ≤ `end`). */
export interface DayRange {
  start: string;
  end: string;
}
