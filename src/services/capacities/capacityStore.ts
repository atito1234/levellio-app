/**
 * Local persistence for capacity ring levels + a per-calendar-day history of
 * capacity points earned (for the monthly progress heatmap). On-device only
 * (KeyValueStore seam); Firebase stays stubbed. Maps to a future doc
 * users/{uid}/capacities -> { levels, history }.
 */
import type { KeyValueStore } from '@/services/storage';
import { CAPACITIES, emptyLevels, type CapacityId, type CapacityLevels } from '@/lib/compounding';

export const CAPACITY_SCHEMA_VERSION = 2;

const NS = 'levellio';
const capacitiesKey = (uid: string) => `${NS}:capacities:${uid}`;
const IDS = CAPACITIES.map((c) => c.id);

/** Per-day capacity points earned, keyed by YYYY-MM-DD. */
export type CapacityHistory = Record<string, number>;

export interface CapacityData {
  levels: CapacityLevels;
  history: CapacityHistory;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Coerce arbitrary stored data into a valid 0-100 levels map. */
export function normalizeLevels(raw: unknown): CapacityLevels {
  const r = ((raw as { levels?: unknown })?.levels ?? {}) as Record<string, unknown>;
  const levels = emptyLevels();
  for (const id of IDS as CapacityId[]) {
    const v = r[id];
    if (typeof v === 'number' && Number.isFinite(v)) levels[id] = clamp(v);
  }
  return levels;
}

/** Coerce stored history into a clean { YYYY-MM-DD: points>=0 } map. */
export function normalizeHistory(raw: unknown): CapacityHistory {
  const r = ((raw as { history?: unknown })?.history ?? {}) as Record<string, unknown>;
  const out: CapacityHistory = {};
  for (const [key, v] of Object.entries(r)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[key] = Math.round(v);
    }
  }
  return out;
}

export class CapacityStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<CapacityData> {
    const raw = await this.store.getItem(capacitiesKey(uid));
    if (!raw) return { levels: emptyLevels(), history: {} };
    try {
      const parsed = JSON.parse(raw);
      return { levels: normalizeLevels(parsed), history: normalizeHistory(parsed) };
    } catch {
      return { levels: emptyLevels(), history: {} };
    }
  }

  async save(uid: string, data: CapacityData): Promise<void> {
    await this.store.setItem(
      capacitiesKey(uid),
      JSON.stringify({ schema: CAPACITY_SCHEMA_VERSION, levels: data.levels, history: data.history }),
    );
  }
}
