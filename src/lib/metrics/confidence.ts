/**
 * Confidence labelling — replaces the old "🔒 unlocks in N days" gating. We now
 * always show the data and instead say how much to trust it, based on how many
 * days of history back it. Pure, no I/O.
 */
import type { TFunction } from 'i18next';
import type { Confidence } from './types';

/** Day thresholds: < 7 → low, < 21 → medium, else high. */
export function confidenceFor(daysOfData: number): Confidence {
  const d = Math.max(0, Math.floor(daysOfData));
  if (d < 7) return 'low';
  if (d < 21) return 'medium';
  return 'high';
}

/**
 * Short chip text for a confidence level, e.g. "Early · 4 days".
 *
 * Pure by default — English literals when no translator is passed (keeps the
 * unit tests green); localized via the `momentum` namespace when `t` is given.
 */
export function confidenceLabel(daysOfData: number, t?: TFunction): string {
  const d = Math.max(0, Math.floor(daysOfData));
  const c = confidenceFor(d);
  if (c === 'high') return t ? t('momentum:confidence.confident') : 'Confident';
  if (t) {
    return c === 'low'
      ? t('momentum:confidence.early', { count: d })
      : t('momentum:confidence.building', { count: d });
  }
  const dayWord = `${d} ${d === 1 ? 'day' : 'days'}`;
  return c === 'low' ? `Early · ${dayWord}` : `Building · ${dayWord}`;
}
