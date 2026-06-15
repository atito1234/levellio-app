/**
 * Personalized, goal-driven context for a habit you're about to battle. Combines
 * the habit's science (src/data/habitScience.ts) with the user's goals so the
 * War Room can say exactly what's at stake — e.g. "What's stopping you from
 * meditating right now?" + "…for your goal 'Lower my stress', that means a calmer
 * mind." Pure, honest (a goal is only named when one actually applies).
 */
import { habitScience } from '@/data/habitScience';
import type { Goal } from './goal';
import type { Quest } from '@/types';

export interface HabitContext {
  phrase: string;
  /** Specific reflection prompt for this habit. */
  prompt: string;
  /** The science one-liner. */
  science: string;
  /** A personalized teaching that weaves in the user's goal when relevant. */
  teaching: string;
  /** The goal this habit contributes to, if any. */
  goalTitle?: string;
}

export function habitContext(quest: Pick<Quest, 'title' | 'category'>, goals: readonly Goal[]): HabitContext {
  const s = habitScience(quest);
  const goal = goals.find((g) => g.categories.includes(quest.category));
  const prompt = `What’s stopping you from ${s.phrase} right now?`;
  const teaching = goal
    ? `${s.science} For your goal “${goal.title}”, that means ${s.why}.`
    : `${s.science} This builds ${s.why}.`;
  return {
    phrase: s.phrase,
    prompt,
    science: s.science,
    teaching,
    ...(goal ? { goalTitle: goal.title } : {}),
  };
}
