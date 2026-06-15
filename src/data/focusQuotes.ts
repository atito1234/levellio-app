/**
 * Short, science-grounded focus quotes shown during a focus session. Curated to
 * reinforce real habit/attention principles (single-tasking, the Zeigarnik pull
 * of starting, identity-based habits, consistency over intensity). Kept honest —
 * encouragement, not fabricated claims.
 */
export interface FocusQuote {
  text: string;
  /** The principle it leans on (for future grouping / a11y context). */
  principle: string;
}

export const FOCUS_QUOTES: readonly FocusQuote[] = [
  { text: 'One thing, fully. Single-tasking is how focus compounds.', principle: 'single-tasking' },
  { text: 'Starting is the hard part — and you already did it.', principle: 'zeigarnik' },
  { text: 'You’re not trying; you’re becoming the kind of person who shows up.', principle: 'identity habits' },
  { text: 'Small reps, repeated, beat rare bursts of effort.', principle: 'consistency' },
  { text: 'Attention is the rarest resource. This is where you spend it.', principle: 'attention' },
  { text: 'Protect this block. Distraction is a choice you can decline.', principle: 'environment design' },
  { text: 'Done beats perfect. Finish the loop and feel the lift.', principle: 'completion reward' },
  { text: 'Breathe. A calm mind focuses sharper than a rushed one.', principle: 'arousal regulation' },
];

/** Pick a stable quote for a session from any numeric seed. Pure. */
export function pickFocusQuote(seed: number): FocusQuote {
  const i = Math.abs(Math.floor(seed)) % FOCUS_QUOTES.length;
  return FOCUS_QUOTES[i]!;
}
