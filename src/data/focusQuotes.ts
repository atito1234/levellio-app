/**
 * Short, science-grounded focus quotes shown during a focus session. Curated to
 * reinforce real habit/attention principles (single-tasking, the Zeigarnik pull
 * of starting, identity-based habits, consistency over intensity). Kept honest —
 * encouragement, not fabricated claims.
 */
export interface FocusQuote {
  /** Stable id → localized text key (`focusQuotes:<id>`); see i18n. */
  id: string;
  text: string;
  /** The principle it leans on (for future grouping / a11y context). */
  principle: string;
}

export const FOCUS_QUOTES: readonly FocusQuote[] = [
  { id: 'single', text: 'One thing, fully. Single-tasking is how focus compounds.', principle: 'single-tasking' },
  { id: 'start', text: 'Starting is the hard part — and you already did it.', principle: 'zeigarnik' },
  { id: 'identity', text: 'You’re not trying; you’re becoming the kind of person who shows up.', principle: 'identity habits' },
  { id: 'reps', text: 'Small reps, repeated, beat rare bursts of effort.', principle: 'consistency' },
  { id: 'attention', text: 'Attention is the rarest resource. This is where you spend it.', principle: 'attention' },
  { id: 'protect', text: 'Protect this block. Distraction is a choice you can decline.', principle: 'environment design' },
  { id: 'done', text: 'Done beats perfect. Finish the loop and feel the lift.', principle: 'completion reward' },
  { id: 'breathe', text: 'Breathe. A calm mind focuses sharper than a rushed one.', principle: 'arousal regulation' },
];

/** Pick a stable quote for a session from any numeric seed. Pure. */
export function pickFocusQuote(seed: number): FocusQuote {
  const i = Math.abs(Math.floor(seed)) % FOCUS_QUOTES.length;
  return FOCUS_QUOTES[i]!;
}
