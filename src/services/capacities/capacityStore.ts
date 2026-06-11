/**
 * Local persistence for capacity ring levels (the accumulated result of logged
 * habit completions). On-device only (KeyValueStore seam); Firebase stays
 * stubbed. Maps to a future doc users/{uid}/capacities -> CapacityLevels.
 */
import type { KeyValueStore } from '@/services/storage';
import { CAPACITIES, emptyLevels, type CapacityId, type CapacityLevels } from '@/lib/compounding';

export const CAPACITY_SCHEMA_VERSION = 1;

const NS = 'levellio';
const capacitiesKey = (uid: string) => `${NS}:capacities:${uid}`;
const IDS = CAPACITIES.map((c) => c.id);

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

export class CapacityStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<CapacityLevels> {
    const raw = await this.store.getItem(capacitiesKey(uid));
    if (!raw) return emptyLevels();
    try {
      return normalizeLevels(JSON.parse(raw));
    } catch {
      return emptyLevels();
    }
  }

  async save(uid: string, levels: CapacityLevels): Promise<void> {
    await this.store.setItem(capacitiesKey(uid), JSON.stringify({ schema: CAPACITY_SCHEMA_VERSION, levels }));
  }
}
