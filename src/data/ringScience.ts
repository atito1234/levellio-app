/**
 * "Why the ring works" — short, honest explainers for the analytics journey view.
 * Each leans on a real principle (Zeigarnik open loops, the habit-formation
 * curve, colour-as-reward). Encouragement, not fabricated claims; the 66-day
 * curve is explicitly illustrative.
 */
export interface RingScienceCard {
  id: string;
  icon: string;
  /** Small caps tag, e.g. "ZEIGARNIK EFFECT". */
  tag: string;
  title: string;
  body: string;
}

export const RING_SCIENCE: readonly RingScienceCard[] = [
  {
    id: 'open-loops',
    icon: '🔄',
    tag: 'ZEIGARNIK EFFECT',
    title: 'Open loops pull you',
    body: 'Your brain keeps unfinished things active until they’re resolved. An open ring is a visible open loop — quietly asking to be closed.',
  },
  {
    id: 'repetition',
    icon: '📈',
    tag: 'HABIT-FORMATION CURVE',
    title: 'Repetition builds the path',
    body: 'Each repeat takes a little less effort, until the behaviour mostly runs itself — on average around 66 days in. Illustrative, never a deadline.',
  },
  {
    id: 'gold',
    icon: '⭐',
    tag: 'COLOUR AS REWARD SIGNAL',
    title: 'Gold = win',
    body: 'Gold appears only at 100% — never on a partial ring — so your brain learns the pattern and starts craving the close.',
  },
];
