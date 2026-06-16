/**
 * Local persistence for the per-day plan — the ordered set of quest ids the user
 * commits to for a given calendar day. On-device only (KeyValueStore seam);
 * Firebase stays stubbed. Maps to a future doc users/{uid}/plan -> { days }.
 *
 * Day-keys are bounded to the most recent N so storage can't grow unbounded.
 */
import type { KeyValueStore } from '@/services/storage';

export const PLAN_SCHEMA_VERSION = 2;
/** Keep at most this many day-keys (older plans are dropped on save). */
export const MAX_PLAN_DAYS = 60;

const NS = 'levellio';
const planKey = (uid: string) => `${NS}:plan:${uid}`;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Plan membership per local day, keyed by YYYY-MM-DD → ordered quest ids. */
export type PlanDays = Record<string, string[]>;

export interface PlanData {
  days: PlanDays;
  /**
   * Day-keys whose recurring habits have already been materialized into `days`.
   * Lets us auto-populate recurring habits exactly once per day so a habit the
   * user later unchecks for that day isn't re-added on reload.
   */
  materializedDays: string[];
}

/** Coerce stored data into a clean list of materialized YYYY-MM-DD keys. */
export function normalizeMaterialized(raw: unknown): string[] {
  const v = (raw as { materializedDays?: unknown })?.materializedDays;
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && DAY_RE.test(x)))];
}

/** Coerce arbitrary stored data into a clean { YYYY-MM-DD: string[] } map. */
export function normalizeDays(raw: unknown): PlanDays {
  const r = ((raw as { days?: unknown })?.days ?? {}) as Record<string, unknown>;
  const out: PlanDays = {};
  for (const [key, v] of Object.entries(r)) {
    if (!DAY_RE.test(key) || !Array.isArray(v)) continue;
    const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
    out[key] = [...new Set(ids)]; // de-dupe, preserve order
  }
  return out;
}

/** Keep only the most recent `max` day-keys (YYYY-MM-DD sorts chronologically). */
export function trimDays(days: PlanDays, max = MAX_PLAN_DAYS): PlanDays {
  const keys = Object.keys(days).sort();
  if (keys.length <= max) return days;
  const out: PlanDays = {};
  for (const k of keys.slice(keys.length - max)) out[k] = days[k]!;
  return out;
}

export class PlanStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<PlanData> {
    const raw = await this.store.getItem(planKey(uid));
    if (!raw) return { days: {}, materializedDays: [] };
    try {
      const parsed = JSON.parse(raw);
      // v1 data has no materializedDays → defaults to [] (no-op, fully compatible).
      return { days: normalizeDays(parsed), materializedDays: normalizeMaterialized(parsed) };
    } catch {
      return { days: {}, materializedDays: [] };
    }
  }

  async save(uid: string, data: PlanData): Promise<void> {
    const days = trimDays(data.days);
    // Only retain markers for days we still keep — drop the rest alongside `days`.
    const kept = new Set(Object.keys(days));
    const materializedDays = data.materializedDays.filter((k) => kept.has(k)).slice(-MAX_PLAN_DAYS);
    await this.store.setItem(
      planKey(uid),
      JSON.stringify({ schema: PLAN_SCHEMA_VERSION, days, materializedDays }),
    );
  }
}
