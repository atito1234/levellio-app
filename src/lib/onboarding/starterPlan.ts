/**
 * Turns the onboarding questionnaire answers into a concrete starter setup so the
 * app is pre-populated for the user's specific needs: which goals to create, which
 * habits (activities) to seed, the dragon (blocker) to default battles to, and
 * which community projects to recommend. Pure + deterministic (no I/O), so it's
 * fully unit-testable; the applier wires it to the existing seeding APIs.
 */
import { GOAL_TEMPLATES, type GoalTemplate } from '@/data/goalTemplates';
import { DRAGONS } from '@/data/dragons';
import { FEATURED_PROJECTS, type FeaturedProjectSeed } from '@/services/projects/featuredProjects';
import type { QuestCategory } from '@/types';

export interface OnboardingAnswers {
  /** Chosen goal-template keys (e.g. ['fit','calm']). */
  focus: string[];
  /** Chosen blocker → dragon id (e.g. 'procrastination'). */
  blocker?: string;
  /** How many daily habits to seed (3 / 5 / 7). */
  habitCount?: number;
  /** Preferred reminder time of day (persisted, not used by the mapping). */
  reminderTime?: string;
  /** The user's personal "why" (persisted, not used by the mapping). */
  why?: string;
}

export interface StarterPlan {
  goalKeys: string[];
  habitIds: string[];
  dragonId: string;
  recommendedProjectIds: string[];
}

const DEFAULT_FOCUS = ['fit'];
const DEFAULT_HABIT_COUNT = 5;
const DEFAULT_DRAGON = 'procrastination';
const VALID_COUNTS = [3, 5, 7];

function templatesFor(keys: readonly string[]): GoalTemplate[] {
  const valid = keys.filter((k) => GOAL_TEMPLATES.some((t) => t.key === k));
  const use = valid.length ? valid : DEFAULT_FOCUS;
  return use
    .map((k) => GOAL_TEMPLATES.find((t) => t.key === k))
    .filter((t): t is GoalTemplate => Boolean(t));
}

/** A featured project's primary category (from its first suggested habit). */
function projectCategory(p: FeaturedProjectSeed): QuestCategory | undefined {
  return p.suggestedHabits[0]?.category;
}

export function buildStarterPlan(answers: OnboardingAnswers): StarterPlan {
  const templates = templatesFor(answers.focus ?? []);
  const goalKeys = templates.map((t) => t.key);

  // Round-robin across chosen goals so each focus gets representation, deduped.
  const count = VALID_COUNTS.includes(answers.habitCount ?? 0) ? answers.habitCount! : DEFAULT_HABIT_COUNT;
  const queues = templates.map((t) => [...t.suggestedHabitIds]);
  const habitIds: string[] = [];
  let i = 0;
  while (habitIds.length < count && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length]!;
    const id = q.shift();
    if (id && !habitIds.includes(id)) habitIds.push(id);
    i += 1;
  }

  // Recommend featured projects whose category matches the user's focus areas.
  const chosenCats = new Set<QuestCategory>(templates.flatMap((t) => t.categories));
  let recommendedProjectIds = FEATURED_PROJECTS.filter((p) => {
    const c = projectCategory(p);
    return c !== undefined && chosenCats.has(c);
  }).map((p) => p.id);
  if (recommendedProjectIds.length === 0) {
    recommendedProjectIds = FEATURED_PROJECTS.slice(0, 2).map((p) => p.id);
  }
  recommendedProjectIds = recommendedProjectIds.slice(0, 3);

  const dragonId = DRAGONS.some((d) => d.id === answers.blocker) ? answers.blocker! : DEFAULT_DRAGON;

  return { goalKeys, habitIds, dragonId, recommendedProjectIds };
}
