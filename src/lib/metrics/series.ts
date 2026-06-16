/**
 * MetricSeries builders — convert the existing aggregates (adherence, session
 * minutes, ratings) into the common `MetricSeries` shape the charts consume.
 * Each series is tagged with its `source` (so the UI can label derived vs.
 * measured) and a `confidence` derived from how many days of data back it.
 *
 * Sensor series (HR/sleep/steps) will be produced by future adapters in exactly
 * this shape, so no chart needs to change when they arrive. Pure, no I/O.
 */
import { sessionDay } from '../analytics';
import { resolveCategory } from '../categories';
import { dayDiff } from '../dates';
import { weeklyAdherencePoints, rangeKeys, type StatInput } from './adherence';
import { confidenceFor } from './confidence';
import type { ActivitySessionEvent } from '../metadata';
import type { BucketColorId } from '../buckets';
import type { DayRange, MetricPoint, MetricSeries, MetricSource } from './types';

/** Distinct local days represented in a session list (for confidence sizing). */
export function distinctSessionDays(sessions: readonly ActivitySessionEvent[]): number {
  return new Set(sessions.map(sessionDay)).size;
}

/** Wrap raw points into a MetricSeries, sizing confidence from the span of data. */
export function toSeries(args: {
  id: string;
  label: string;
  points: MetricPoint[];
  source: MetricSource;
  unit?: string;
  colorId?: BucketColorId;
  /** Override the day-count used for confidence; defaults to the point span. */
  daysOfData?: number;
}): MetricSeries {
  const span =
    args.daysOfData ??
    (args.points.length === 0
      ? 0
      : dayDiff(args.points[0]!.dayKey, args.points[args.points.length - 1]!.dayKey) + 1);
  return {
    id: args.id,
    label: args.label,
    unit: args.unit,
    source: args.source,
    colorId: args.colorId,
    points: args.points,
    confidence: confidenceFor(span),
  };
}

/** Weekly adherence (%) over the range as a derived trend series. */
export function adherenceTrendSeries(input: StatInput, opts?: { label?: string }): MetricSeries {
  const points = weeklyAdherencePoints(input);
  return toSeries({
    id: `adherence:${input.id}`,
    label: opts?.label ?? `${input.label} adherence`,
    points,
    source: 'derived',
    unit: '%',
    colorId: input.colorId,
    daysOfData: dayDiff(input.range.start, input.range.end) + 1,
  });
}

/** Daily minutes spent in a category over the range (derived, zero-filled). */
export function categoryMinutesSeries(
  sessions: readonly ActivitySessionEvent[],
  category: string,
  range: DayRange,
  colorId?: BucketColorId,
): MetricSeries {
  const want = resolveCategory(category);
  const perDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.category || resolveCategory(s.category) !== want) continue;
    const day = sessionDay(s);
    perDay.set(day, (perDay.get(day) ?? 0) + s.durationSec / 60);
  }
  const points = rangeKeys(range).map((dayKey) => ({
    dayKey,
    value: Math.round(perDay.get(dayKey) ?? 0),
  }));
  return toSeries({
    id: `minutes:${want}`,
    label: `${want} minutes`,
    points,
    source: 'derived',
    unit: 'min',
    colorId,
    daysOfData: dayDiff(range.start, range.end) + 1,
  });
}

/**
 * Average self-reported rating (1–5) per day, for all sessions or a single
 * activity. Only days with a rating produce a point — this is a self-report.
 */
export function ratingTrendSeries(
  sessions: readonly ActivitySessionEvent[],
  opts?: { activityId?: string; label?: string; colorId?: BucketColorId },
): MetricSeries {
  const sums = new Map<string, { total: number; n: number }>();
  for (const s of sessions) {
    if (opts?.activityId && s.activityId !== opts.activityId) continue;
    if (!s.rating) continue;
    const day = sessionDay(s);
    const cur = sums.get(day) ?? { total: 0, n: 0 };
    cur.total += s.rating;
    cur.n += 1;
    sums.set(day, cur);
  }
  const points = [...sums.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([dayKey, { total, n }]) => ({ dayKey, value: Math.round((total / n) * 10) / 10 }));
  return toSeries({
    id: `rating:${opts?.activityId ?? 'all'}`,
    label: opts?.label ?? 'How it felt',
    points,
    source: 'self-report',
    unit: '/5',
    colorId: opts?.colorId,
    daysOfData: points.length,
  });
}
