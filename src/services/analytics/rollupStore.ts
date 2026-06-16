/**
 * Local persistence for daily roll-ups — durable per-day analytics aggregates
 * that outlive the capped session log. On-device only (KeyValueStore seam);
 * Firebase stays stubbed. Maps to a future doc users/{uid}/rollups -> { days }.
 *
 * Bounded to the most recent N days so storage can't grow unbounded, while still
 * spanning ~13 months for long-term trends. Sensor metrics extend DailyRollup.
 */
import type { KeyValueStore } from '@/services/storage';
import type { DailyRollup } from '@/lib/metrics/rollup';

export const ROLLUP_SCHEMA_VERSION = 1;
/** Keep at most this many days (~13 months) of roll-ups. */
export const MAX_ROLLUP_DAYS = 400;

const NS = 'levellio';
const rollupKey = (uid: string) => `${NS}:rollups:${uid}`;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type RollupDays = Record<string, DailyRollup>;

function numRecord(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
  }
  return out;
}

/** Coerce one stored entry into a clean DailyRollup, or null if unusable. */
export function normalizeRollup(dayKey: string, raw: unknown): DailyRollup | null {
  if (!DAY_RE.test(dayKey) || !raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DailyRollup>;
  const rating = typeof r.ratingAvg === 'number' && Number.isFinite(r.ratingAvg) ? r.ratingAvg : undefined;
  return {
    dayKey,
    perCategoryMin: numRecord(r.perCategoryMin),
    perCategoryDone: numRecord(r.perCategoryDone),
    capacityPoints: numRecord(r.capacityPoints),
    sessions: typeof r.sessions === 'number' && Number.isFinite(r.sessions) ? r.sessions : 0,
    ...(rating !== undefined ? { ratingAvg: rating } : {}),
  };
}

/** Coerce arbitrary stored data into a clean { YYYY-MM-DD: DailyRollup } map. */
export function normalizeRollups(raw: unknown): RollupDays {
  const r = ((raw as { days?: unknown })?.days ?? {}) as Record<string, unknown>;
  const out: RollupDays = {};
  for (const [key, v] of Object.entries(r)) {
    const norm = normalizeRollup(key, v);
    if (norm) out[key] = norm;
  }
  return out;
}

/** Keep only the most recent `max` day-keys (YYYY-MM-DD sorts chronologically). */
export function trimRollups(days: RollupDays, max = MAX_ROLLUP_DAYS): RollupDays {
  const keys = Object.keys(days).sort();
  if (keys.length <= max) return days;
  const out: RollupDays = {};
  for (const k of keys.slice(keys.length - max)) out[k] = days[k]!;
  return out;
}

export class RollupStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<RollupDays> {
    const raw = await this.store.getItem(rollupKey(uid));
    if (!raw) return {};
    try {
      return normalizeRollups(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  async save(uid: string, days: RollupDays): Promise<void> {
    const trimmed = trimRollups(days);
    await this.store.setItem(rollupKey(uid), JSON.stringify({ schema: ROLLUP_SCHEMA_VERSION, days: trimmed }));
  }
}
