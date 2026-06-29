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

/** Per-dragon "kept the streak" record — consecutive days you bested it. */
export interface DragonStreak {
  streak: number;
  lastDate: string;
}

export interface BattleProgress {
  totalSlain: number;
  /** Victory count keyed by dragon id. */
  perDragon: Record<string, number>;
  /** Consecutive-day streak per dragon (drives the Dragon Den). */
  perDragonStreak: Record<string, DragonStreak>;
  /** Coins earned from battles, spendable on Armory unlocks. */
  coins: number;
  /** Cosmetic unlocks bought with coins. */
  ownedUnlocks: string[];
  /** Lifetime count of pre-battle prep rites performed. */
  ritesPerformed: number;
  lastTechniqueId?: TechniqueId;
  lastCustomMin?: number;
}

export const EMPTY_BATTLE_PROGRESS: BattleProgress = {
  totalSlain: 0,
  perDragon: {},
  perDragonStreak: {},
  coins: 0,
  ownedUnlocks: [],
  ritesPerformed: 0,
};

export function normalizeBattleProgress(raw: unknown): BattleProgress {
  const r = (raw ?? {}) as Partial<BattleProgress>;
  const perDragon: Record<string, number> = {};
  if (r.perDragon && typeof r.perDragon === 'object') {
    for (const [id, n] of Object.entries(r.perDragon)) {
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) perDragon[id] = Math.floor(n);
    }
  }
  const perDragonStreak: Record<string, DragonStreak> = {};
  if (r.perDragonStreak && typeof r.perDragonStreak === 'object') {
    for (const [id, s] of Object.entries(r.perDragonStreak as Record<string, unknown>)) {
      const v = s as Partial<DragonStreak>;
      if (v && typeof v.streak === 'number' && Number.isFinite(v.streak) && v.streak > 0 && typeof v.lastDate === 'string') {
        perDragonStreak[id] = { streak: Math.floor(v.streak), lastDate: v.lastDate };
      }
    }
  }
  const totalSlain =
    typeof r.totalSlain === 'number' && Number.isFinite(r.totalSlain) && r.totalSlain >= 0
      ? Math.floor(r.totalSlain)
      : Object.values(perDragon).reduce((a, b) => a + b, 0);
  const ownedUnlocks = Array.isArray(r.ownedUnlocks) ? r.ownedUnlocks.filter((x): x is string => typeof x === 'string') : [];
  return {
    totalSlain,
    perDragon,
    perDragonStreak,
    coins: typeof r.coins === 'number' && Number.isFinite(r.coins) && r.coins >= 0 ? Math.floor(r.coins) : 0,
    ownedUnlocks,
    ritesPerformed: typeof r.ritesPerformed === 'number' && Number.isFinite(r.ritesPerformed) && r.ritesPerformed >= 0 ? Math.floor(r.ritesPerformed) : 0,
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
