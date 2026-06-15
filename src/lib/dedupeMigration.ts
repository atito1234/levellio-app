/**
 * Pure helpers for the one-time duplicate-merge migration: repoint references
 * that pointed at now-merged quest ids onto their survivor. No I/O.
 *
 * `remap` is { oldId -> survivorId } from `dedupeQuests` (src/lib/questForm.ts).
 */

/** A plan's per-day membership (YYYY-MM-DD -> ordered quest ids). */
type DayMap = Record<string, string[]>;

/** Repoint every quest id in each day's plan to its survivor (de-duped per day). */
export function repointPlanDays(days: DayMap, remap: Record<string, string>): DayMap {
  const out: DayMap = {};
  for (const [day, ids] of Object.entries(days)) {
    out[day] = [...new Set(ids.map((id) => remap[id] ?? id))];
  }
  return out;
}

/**
 * Repoint bucket assignments ({ activityId -> bucketId }) onto survivors. When
 * two merged ids had different buckets, the first one encountered wins (stable).
 */
export function repointAssignments(
  assignments: Record<string, string>,
  remap: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [activityId, bucketId] of Object.entries(assignments)) {
    const survivor = remap[activityId] ?? activityId;
    if (!(survivor in out)) out[survivor] = bucketId;
  }
  return out;
}
