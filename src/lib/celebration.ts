/**
 * Pure timing/gating for the Quest Complete celebration. Centralizing this lets
 * the screen stay declarative and makes the reduced-motion fallback unit-testable:
 * when reduced motion is on, nothing animates and values snap to their finals.
 */
export interface CelebrationTimings {
  /** Whether any animation should run at all. */
  animate: boolean;
  /** Whether to render the confetti flourish. */
  confetti: boolean;
  /** XP count-up duration (ms); 0 means snap to final. */
  xpCountMs: number;
  /** Progress-bar fill duration (ms); 0 means snap to final. */
  barFillMs: number;
  /** Delay before the level-up badge pops (ms). */
  popDelayMs: number;
}

export function getCelebrationTimings(reducedMotion: boolean): CelebrationTimings {
  if (reducedMotion) {
    return { animate: false, confetti: false, xpCountMs: 0, barFillMs: 0, popDelayMs: 0 };
  }
  return { animate: true, confetti: true, xpCountMs: 900, barFillMs: 800, popDelayMs: 1700 };
}
