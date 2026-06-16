/**
 * Daily roll-ups — compact, append-only per-day aggregates that outlive the
 * capped session log (metadataStore keeps only the most recent N events). By
 * snapshotting each past day once, long-term trends (months/seasons) survive,
 * and measured metrics (future sensor data) can share the same per-day record.
 *
 * Pure, no I/O — the store persists these; readers merge stored history with the
 * still-live recent sessions.
 */
import { sessionDay } from '../analytics';
import { resolveCategory } from '../categories';
import { rippleForQuest } from '../habitCapacity';
import type { CapacityId } from '../compounding';
import type { ActivitySessionEvent } from '../metadata';

/** One day's compact aggregate. Sensor metrics will extend this record. */
export interface DailyRollup {
  dayKey: string;
  /** Minutes spent per resolved category. */
  perCategoryMin: Record<string, number>;
  /** Completed sessions per resolved category. */
  perCategoryDone: Record<string, number>;
  /** Summed capacity ripple deltas for the day, per capacity. */
  capacityPoints: Partial<Record<CapacityId, number>>;
  /** Total sessions that day. */
  sessions: number;
  /** Mean self-reported rating that day, if any were given. */
  ratingAvg?: number;
}

/** Aggregate a single day's sessions into a compact rollup. */
export function rollupForDay(sessions: readonly ActivitySessionEvent[], dayKey: string): DailyRollup {
  const today = sessions.filter((s) => sessionDay(s) === dayKey);
  const perCategoryMin: Record<string, number> = {};
  const perCategoryDone: Record<string, number> = {};
  const capacityPoints: Partial<Record<CapacityId, number>> = {};
  let ratingSum = 0;
  let ratingN = 0;

  for (const s of today) {
    const cat = s.category ? resolveCategory(s.category) : 'uncategorized';
    perCategoryMin[cat] = (perCategoryMin[cat] ?? 0) + Math.round(s.durationSec / 60);
    perCategoryDone[cat] = (perCategoryDone[cat] ?? 0) + 1;
    if (s.category) {
      for (const d of rippleForQuest({ category: resolveCategory(s.category) })) {
        capacityPoints[d.capacityId] = (capacityPoints[d.capacityId] ?? 0) + d.delta;
      }
    }
    if (s.rating) {
      ratingSum += s.rating;
      ratingN += 1;
    }
  }

  return {
    dayKey,
    perCategoryMin,
    perCategoryDone,
    capacityPoints,
    sessions: today.length,
    ...(ratingN > 0 ? { ratingAvg: Math.round((ratingSum / ratingN) * 10) / 10 } : {}),
  };
}

/** Roll up every day represented in a session list (compact: only active days). */
export function rollupDays(sessions: readonly ActivitySessionEvent[]): Record<string, DailyRollup> {
  const days = new Set(sessions.map(sessionDay));
  const out: Record<string, DailyRollup> = {};
  for (const day of days) out[day] = rollupForDay(sessions, day);
  return out;
}

/**
 * Merge stored history with freshly-computed recent rollups. Recent days win
 * (they reflect the live session log), so re-snapshotting a day is idempotent.
 */
export function mergeRollups(
  history: Record<string, DailyRollup>,
  recent: Record<string, DailyRollup>,
): Record<string, DailyRollup> {
  return { ...history, ...recent };
}
