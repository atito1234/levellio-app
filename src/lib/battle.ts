/**
 * Pure battle state — maps elapsed focus time to the dragon's health and whether
 * it's slain. Honest: the visuals read directly from real elapsed seconds.
 *
 * Timed techniques: health = remaining/total; reaching 0 auto-slays the dragon.
 * Flowtime (totalSec === null): health is a soft, cosmetic fill that creeps
 * toward a floor but NEVER reaches 0 on its own — the user lands the final blow
 * (manual Finish), so the dragon is only `won` when the screen marks it finished.
 */
export interface BattleState {
  phase: 'work' | 'won';
  /** Total work seconds, or null for Flowtime. */
  totalSec: number | null;
  /** Seconds left for timed techniques; null for Flowtime. */
  remainingSec: number | null;
  /** 0-100; drains as work elapses. */
  dragonHealthPct: number;
  /** True only when a timed block has fully elapsed. */
  won: boolean;
}

/** Flowtime soft-health: approaches this floor but never auto-finishes. */
const FLOWTIME_FLOOR_PCT = 10;
/** Elapsed seconds at which Flowtime health reaches the floor (~25 min). */
const FLOWTIME_FULL_SEC = 25 * 60;

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function battleStateAt(totalSec: number | null, elapsedSec: number): BattleState {
  const elapsed = Math.max(0, Math.floor(elapsedSec));

  if (totalSec === null) {
    // Flowtime: cosmetic drain toward a floor; never auto-won.
    const drained = (elapsed / FLOWTIME_FULL_SEC) * (100 - FLOWTIME_FLOOR_PCT);
    return {
      phase: 'work',
      totalSec: null,
      remainingSec: null,
      dragonHealthPct: Math.max(FLOWTIME_FLOOR_PCT, clampPct(100 - drained)),
      won: false,
    };
  }

  const remaining = Math.max(0, totalSec - elapsed);
  const won = remaining <= 0;
  return {
    phase: won ? 'won' : 'work',
    totalSec,
    remainingSec: remaining,
    dragonHealthPct: totalSec > 0 ? clampPct((remaining / totalSec) * 100) : 0,
    won,
  };
}
