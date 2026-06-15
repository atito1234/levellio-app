/**
 * Time-management techniques the user can pick per Battle. Pure config + helpers,
 * no I/O. A technique defines a work block (and a suggested break); Flowtime is
 * open-ended (counts up, no fixed end — the user lands the final blow).
 */
export type TechniqueId = 'pomodoro' | 'deepwork' | 'quick10' | 'custom' | 'flowtime';

export interface Technique {
  id: TechniqueId;
  name: string;
  /** Work minutes (the default for 'custom'; overridable per battle). */
  workMin: number;
  /** Suggested break minutes (shown as a nudge; not an enforced timer yet). */
  breakMin: number;
  /** True for Flowtime: counts up with no fixed end. */
  countsUp: boolean;
  blurb: string;
}

export const TECHNIQUES: readonly Technique[] = [
  { id: 'pomodoro', name: 'Pomodoro', workMin: 25, breakMin: 5, countsUp: false, blurb: 'Classic 25/5 focus sprints.' },
  { id: 'deepwork', name: 'Deep Work', workMin: 52, breakMin: 17, countsUp: false, blurb: 'Long 52/17 deep-work block.' },
  { id: 'quick10', name: 'Quick 10', workMin: 10, breakMin: 0, countsUp: false, blurb: 'A fast 10-minute round.' },
  { id: 'custom', name: 'Custom', workMin: 20, breakMin: 5, countsUp: false, blurb: 'Set your own minutes.' },
  { id: 'flowtime', name: 'Flowtime', workMin: 0, breakMin: 0, countsUp: true, blurb: 'Open-ended — flow until done.' },
];

export const CUSTOM_MIN_BOUNDS = { min: 1, max: 180 } as const;

export function getTechnique(id: TechniqueId): Technique {
  return TECHNIQUES.find((t) => t.id === id) ?? TECHNIQUES[0]!;
}

/** Clamp a user-entered custom duration to a sane range. */
export function clampCustomMinutes(min: number): number {
  if (!Number.isFinite(min)) return getTechnique('custom').workMin;
  return Math.max(CUSTOM_MIN_BOUNDS.min, Math.min(CUSTOM_MIN_BOUNDS.max, Math.round(min)));
}

/**
 * Total work seconds for a technique. Returns `null` for Flowtime (no fixed
 * end). For 'custom', uses `customMin` when provided (clamped).
 */
export function workSeconds(technique: Technique, customMin?: number): number | null {
  if (technique.countsUp) return null;
  const minutes = technique.id === 'custom' ? clampCustomMinutes(customMin ?? technique.workMin) : technique.workMin;
  return minutes * 60;
}
