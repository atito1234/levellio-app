/**
 * Pure helpers for the steps / pedometer feature (B2a). No I/O, no native code —
 * fully unit-testable. The actual device step source lives behind a service seam
 * (`src/services/health/stepsService.ts`) so this stays platform-agnostic.
 */

export interface StepProgress {
  steps: number;
  goal: number;
  /** 0–100, clamped. */
  pct: number;
  reached: boolean;
}

/** Today's progress toward a daily step goal. */
export function stepGoalProgress(steps: number, goal: number): StepProgress {
  const s = Math.max(0, Math.floor(steps));
  const g = Math.max(1, Math.floor(goal));
  const pct = Math.min(100, Math.round((s / g) * 100));
  return { steps: s, goal: g, pct, reached: s >= g };
}

/** A common, friendly default daily step goal. */
export const DEFAULT_STEP_GOAL = 8000;
