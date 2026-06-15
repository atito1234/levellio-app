/**
 * Honest, science-grounded context for a habit — used to make the War Room
 * specific instead of vague ("What's stopping you from MEDITATING?" + why it
 * matters). Keyword matches first (meditate, water, run…), then a category
 * fallback. Encouraging but not fabricated — general, well-established science.
 */
import type { QuestCategory } from '@/types';

export interface HabitScience {
  /** Gerund/action phrase for prompts, e.g. "meditating", "drinking water". */
  phrase: string;
  /** One-line teaching on why this habit works. */
  science: string;
  /** The payoff, phrased to slot into "…this means {why}". */
  why: string;
}

interface KeywordScience extends HabitScience {
  match: string[];
}

const KEYWORDS: readonly KeywordScience[] = [
  { match: ['meditat'], phrase: 'meditating', science: 'Even 10 minutes of meditation is shown to lower stress hormones and strengthen the brain’s attention networks.', why: 'a calmer mind and steadier focus' },
  { match: ['breath'], phrase: 'breathing', science: 'Slow breathing activates the vagus nerve, shifting you out of fight-or-flight within minutes.', why: 'fast, on-demand calm' },
  { match: ['water', 'hydrat'], phrase: 'drinking water', science: 'Even mild dehydration measurably reduces energy, mood, and concentration.', why: 'steadier energy and clearer thinking' },
  { match: ['run', 'jog'], phrase: 'running', science: 'Aerobic exercise releases BDNF, which supports new brain cells and lifts mood for hours.', why: 'more energy and a brighter mood' },
  { match: ['walk', 'steps'], phrase: 'walking', science: 'A short walk boosts circulation and creative thinking, and reliably lowers stress.', why: 'an easy energy and mood reset' },
  { match: ['workout', 'gym', 'exercise', 'strength', 'lift'], phrase: 'working out', science: 'Resistance training improves insulin sensitivity, sleep, and confidence over time.', why: 'a stronger, more resilient body' },
  { match: ['read'], phrase: 'reading', science: 'Daily reading compounds knowledge and is linked to slower cognitive decline.', why: 'a sharper, better-stocked mind' },
  { match: ['sleep', 'bed'], phrase: 'winding down for sleep', science: 'Consistent sleep timing is the single biggest lever for energy, mood, and willpower.', why: 'more energy and self-control tomorrow' },
  { match: ['journal', 'gratitude'], phrase: 'journaling', science: 'Expressive writing and gratitude practice measurably reduce anxiety and improve outlook.', why: 'a clearer, more grounded headspace' },
  { match: ['veg', 'salad', 'fruit', 'meal', 'sugar', 'eat'], phrase: 'eating well', science: 'Whole foods steady your blood sugar, which steadies energy, focus, and mood.', why: 'fewer crashes and steadier focus' },
];

const CATEGORY: Record<QuestCategory, HabitScience> = {
  fitness: { phrase: 'moving your body', science: 'Movement releases mood-lifting endorphins and builds long-term energy.', why: 'more energy and resilience' },
  mind: { phrase: 'this', science: 'Training your mind lowers stress and strengthens attention over time.', why: 'a calmer, sharper mind' },
  learning: { phrase: 'learning', science: 'Spaced, repeated practice is how skills and knowledge compound.', why: 'steady, compounding growth' },
  health: { phrase: 'this', science: 'Small health habits compound into big changes in energy and longevity.', why: 'a healthier, more energetic you' },
  productivity: { phrase: 'this', science: 'Finishing what you start trains focus and builds momentum.', why: 'more done with less stress' },
  relationships: { phrase: 'connecting', science: 'Strong relationships are among the best predictors of happiness and health.', why: 'deeper connection and support' },
  creativity: { phrase: 'creating', science: 'Regular creative practice strengthens problem-solving and wellbeing.', why: 'a more expressive, inventive you' },
  finance: { phrase: 'this', science: 'Small, consistent money habits reduce stress and build security.', why: 'less stress and more freedom' },
};

/** Resolve the best science context for a habit (keyword first, then category). */
export function habitScience(quest: { title: string; category: QuestCategory }): HabitScience {
  const t = quest.title.toLowerCase();
  for (const k of KEYWORDS) {
    if (k.match.some((m) => t.includes(m))) return { phrase: k.phrase, science: k.science, why: k.why };
  }
  const cat = CATEGORY[quest.category];
  return { phrase: cat.phrase === 'this' ? quest.title.toLowerCase() : cat.phrase, science: cat.science, why: cat.why };
}
