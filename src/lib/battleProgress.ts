/**
 * Pure transforms over BattleProgress — recording a victory (with a per-dragon
 * streak), and spending coins on Armory unlocks. No I/O; fully unit-tested. The
 * BattlesContext calls these and persists the result.
 */
import { advanceStreak } from './streak';
import type { BattleProgress, DragonStreak } from '@/services/battles';

export interface VictoryOpts {
  /** Coins earned this fight (base + any prep bonus). */
  coinsEarned?: number;
  /** True when the user performed a pre-battle prep rite. */
  prepared?: boolean;
}

/** Record a slain dragon: totals, per-dragon count + day-streak, coins, rites. */
export function recordDragonVictory(
  p: BattleProgress,
  dragonId: string,
  now: Date,
  opts: VictoryOpts = {},
): BattleProgress {
  const prev = p.perDragonStreak[dragonId];
  const upd = advanceStreak({ streakDays: prev?.streak ?? 0, ...(prev ? { lastCompletionDate: prev.lastDate } : {}) }, now);
  const nextStreak: DragonStreak = { streak: upd.streakDays, lastDate: upd.lastCompletionDate };
  return {
    ...p,
    totalSlain: p.totalSlain + 1,
    perDragon: { ...p.perDragon, [dragonId]: (p.perDragon[dragonId] ?? 0) + 1 },
    perDragonStreak: { ...p.perDragonStreak, [dragonId]: nextStreak },
    coins: p.coins + Math.max(0, Math.floor(opts.coinsEarned ?? 0)),
    ritesPerformed: p.ritesPerformed + (opts.prepared ? 1 : 0),
  };
}

/** Current consecutive-day streak for a dragon (0 if none). */
export function dragonStreakOf(p: BattleProgress, dragonId: string): number {
  return p.perDragonStreak[dragonId]?.streak ?? 0;
}

export function ownsUnlock(p: BattleProgress, id: string): boolean {
  return p.ownedUnlocks.includes(id);
}

export function canAfford(p: BattleProgress, cost: number): boolean {
  return p.coins >= Math.max(0, Math.floor(cost));
}

/** Buy a cosmetic unlock. Returns the updated progress, or null if it can't. */
export function buyUnlock(p: BattleProgress, id: string, cost: number): BattleProgress | null {
  if (ownsUnlock(p, id) || !canAfford(p, cost)) return null;
  return { ...p, coins: p.coins - Math.max(0, Math.floor(cost)), ownedUnlocks: [...p.ownedUnlocks, id] };
}
