/**
 * Confidence labelling — replaces the old "🔒 unlocks in N days" gating. We now
 * always show the data and instead say how much to trust it, based on how many
 * days of history back it. Pure, no I/O.
 */
import type { Confidence } from './types';

/** Day thresholds: < 7 → low, < 21 → medium, else high. */
export function confidenceFor(daysOfData: number): Confidence {
  const d = Math.max(0, Math.floor(daysOfData));
  if (d < 7) return 'low';
  if (d < 21) return 'medium';
  return 'high';
}

/** Short chip text for a confidence level, e.g. "Early · 4 days". */
export function confidenceLabel(daysOfData: number): string {
  const d = Math.max(0, Math.floor(daysOfData));
  const c = confidenceFor(d);
  const dayWord = `${d} ${d === 1 ? 'day' : 'days'}`;
  if (c === 'low') return `Early · ${dayWord}`;
  if (c === 'medium') return `Building · ${dayWord}`;
  return 'Confident';
}
