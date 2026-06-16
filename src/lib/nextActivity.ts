/**
 * "What's next" engine — after finishing an activity, pick the most sensible next
 * open activity to suggest, even across goals/groups. Order of preference:
 *   1. an explicitly LINKED activity (the user's chain) that's still open today
 *   2. an open activity in the SAME goal/category
 *   3. the next open planned activity anywhere
 * Also returns the goals that still have open activities, for a "focus a
 * different goal" choice. Pure, no I/O.
 */
import { plannedOpen } from './plan';
import { goalHabits, type Goal } from './goal';
import { neighbors, type LinkMap } from './links';
import type { Quest } from '@/types';

export type NextReason = 'chain' | 'goal' | 'planned' | 'none';

export interface GoalChoice {
  goal: Goal;
  openCount: number;
}

export interface NextSuggestion {
  next?: Quest;
  reason: NextReason;
  /** Goals that still have open activities today, busiest first. */
  goalChoices: GoalChoice[];
}

export interface NextInput {
  justCompletedId: string;
  quests: readonly Quest[];
  plannedIds?: readonly string[];
  goals: readonly Goal[];
  links: LinkMap;
}

export function nextActivity({ justCompletedId, quests, plannedIds, goals, links }: NextInput): NextSuggestion {
  const completed = quests.find((q) => q.id === justCompletedId);
  const openPlanned = plannedOpen(quests, plannedIds).filter((q) => q.id !== justCompletedId);
  const openIds = new Set(openPlanned.map((q) => q.id));

  // 1. A linked activity still open today (the chain).
  const chainNext = neighbors(links, justCompletedId)
    .map((id) => openPlanned.find((q) => q.id === id))
    .find((q): q is Quest => !!q);

  // 2. Same goal/category.
  const sameGoal = completed ? openPlanned.find((q) => q.category === completed.category) : undefined;

  // 3. Anything else open.
  const anyOpen = openPlanned[0];

  let next: Quest | undefined;
  let reason: NextReason = 'none';
  if (chainNext) {
    next = chainNext;
    reason = 'chain';
  } else if (sameGoal) {
    next = sameGoal;
    reason = 'goal';
  } else if (anyOpen) {
    next = anyOpen;
    reason = 'planned';
  }

  const goalChoices: GoalChoice[] = goals
    .map((goal) => {
      const ids = new Set(goalHabits(quests, goal).map((q) => q.id));
      return { goal, openCount: openPlanned.filter((q) => ids.has(q.id)).length };
    })
    .filter((c) => c.openCount > 0)
    .sort((a, b) => b.openCount - a.openCount);

  return { ...(next ? { next } : {}), reason, goalChoices };
}
