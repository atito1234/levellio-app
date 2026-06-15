/**
 * Local persistence for Battle progression — the "lifelong mission" tally of
 * dragons slain (total + per-dragon) plus the user's last technique choice.
 * On-device only (KeyValueStore seam); Firebase stays stubbed. Maps to a future
 * users/{uid}/battles doc.
 */
import type { KeyValueStore } from '@/services/storage';
import type { TechniqueId } from '@/lib/timeTechniques';

export const BATTLE_SCHEMA_VERSION = 1;

const NS = 'levellio';
const battlesKey = (uid: string) => `${NS}:battles:${uid}`;
const TECHNIQUE_IDS = new Set<TechniqueId>(['pomodoro', 'deepwork', 'quick10', 'custom', 'flowtime']);

export interface BattleProgress {
  totalSlain: number;
  /** Victory count keyed by dragon id. */
  perDragon: Record<string, number>;
  lastTechniqueId?: TechniqueId;
  lastCustomMin?: number;
}

export const EMPTY_BATTLE_PROGRESS: BattleProgress = { totalSlain: 0, perDragon: {} };

export function normalizeBattleProgress(raw: unknown): BattleProgress {
  const r = (raw ?? {}) as Partial<BattleProgress>;
  const perDragon: Record<string, number> = {};
  if (r.perDragon && typeof r.perDragon === 'object') {
    for (const [id, n] of Object.entries(r.perDragon)) {
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) perDragon[id] = Math.floor(n);
    }
  }
  const totalSlain =
    typeof r.totalSlain === 'number' && Number.isFinite(r.totalSlain) && r.totalSlain >= 0
      ? Math.floor(r.totalSlain)
      : Object.values(perDragon).reduce((a, b) => a + b, 0);
  return {
    totalSlain,
    perDragon,
    ...(typeof r.lastTechniqueId === 'string' && TECHNIQUE_IDS.has(r.lastTechniqueId as TechniqueId)
      ? { lastTechniqueId: r.lastTechniqueId as TechniqueId }
      : {}),
    ...(typeof r.lastCustomMin === 'number' && Number.isFinite(r.lastCustomMin)
      ? { lastCustomMin: Math.floor(r.lastCustomMin) }
      : {}),
  };
}

export class BattleStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<BattleProgress> {
    const raw = await this.store.getItem(battlesKey(uid));
    if (!raw) return { ...EMPTY_BATTLE_PROGRESS, perDragon: {} };
    try {
      return normalizeBattleProgress(JSON.parse(raw));
    } catch {
      return { ...EMPTY_BATTLE_PROGRESS, perDragon: {} };
    }
  }

  async save(uid: string, progress: BattleProgress): Promise<void> {
    await this.store.setItem(battlesKey(uid), JSON.stringify({ schema: BATTLE_SCHEMA_VERSION, ...progress }));
  }
}
