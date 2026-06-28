/**
 * Turns the onboarding questionnaire answers into a concrete starter setup so the
 * app is pre-populated for the user's specific needs: which goals to create, which
 * habits (activities) to seed, the dragon (blocker) to default battles to, which
 * community projects to recommend, and — for the food focus — which recipes match
 * their dietary profile. Pure + deterministic (no I/O), so it's fully
 * unit-testable; the applier wires it to the existing seeding APIs.
 */
import { GOAL_TEMPLATES, type GoalTemplate } from '@/data/goalTemplates';
import { HABIT_LIBRARY } from '@/data/habitLibrary';
import { DRAGONS } from '@/data/dragons';
import { recipesForDiet } from '@/data/recipes';
import { FEATURED_PROJECTS, type FeaturedProjectSeed } from '@/services/projects/featuredProjects';
import type { DietaryTag, QuestCategory } from '@/types';

export interface OnboardingAnswers {
  /** Chosen goal-template keys (e.g. ['fit','calm']). */
  focus: string[];
  /**
   * Per-focus follow-up answers: focus key → selected option ids
   * (e.g. { eat: ['vegan'], fit: ['gym'] }). Drives tailored activities + recipes.
   */
  focusDetail?: Record<string, string[]>;
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
  /** Recipes matched to the user's dietary profile (empty unless eat focus chosen). */
  recommendedRecipeIds: string[];
  /** Dietary profile derived from the eat follow-up, if any. */
  dietaryTag?: DietaryTag;
}

const DEFAULT_FOCUS = ['fit'];
const DEFAULT_HABIT_COUNT = 5;
const DEFAULT_DRAGON = 'procrastination';
const VALID_COUNTS = [3, 5, 7];

/** Map an "eat" follow-up option id to a dietary tag. */
const DIET_BY_OPTION: Record<string, DietaryTag> = {
  omnivore: 'omnivore',
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  pescatarian: 'pescatarian',
  glutenfree: 'gluten-free',
};

function templatesFor(keys: readonly string[]): GoalTemplate[] {
  const valid = keys.filter((k) => GOAL_TEMPLATES.some((t) => t.key === k));
  const use = valid.length ? valid : DEFAULT_FOCUS;
  return use
    .map((k) => GOAL_TEMPLATES.find((t) => t.key === k))
    .filter((t): t is GoalTemplate => Boolean(t));
}

/** Personalization tags chosen for a focus (resolved from its follow-up options). */
function tagsForFocus(template: GoalTemplate, selectedOptionIds: readonly string[]): string[] {
  if (!template.followUp) return [];
  return template.followUp.options
    .filter((o) => selectedOptionIds.includes(o.id))
    .flatMap((o) => o.tags);
}

/**
 * The habit ids to seed for a goal, given the user's follow-up tags. Habits in the
 * library tagged with a selected tag are surfaced first (so the round-robin favors
 * them); the template's base suggestions follow. Deterministic and deduped.
 */
export function personalizedHabitIds(template: GoalTemplate, tags: readonly string[]): string[] {
  if (!tags.length) return [...template.suggestedHabitIds];
  const tagged = HABIT_LIBRARY.filter((h) => h.tags?.some((t) => tags.includes(t))).map((h) => h.id);
  const ordered = [...tagged, ...template.suggestedHabitIds];
  return ordered.filter((id, i) => ordered.indexOf(id) === i);
}

/** A featured project's primary category (from its first suggested habit). */
function projectCategory(p: FeaturedProjectSeed): QuestCategory | undefined {
  return p.suggestedHabits[0]?.category;
}

export function buildStarterPlan(answers: OnboardingAnswers): StarterPlan {
  const templates = templatesFor(answers.focus ?? []);
  const goalKeys = templates.map((t) => t.key);
  const detail = answers.focusDetail ?? {};

  // Round-robin across chosen goals so each focus gets representation, deduped —
  // now drawing from each goal's *personalized* habit list (follow-up tags first).
  const count = VALID_COUNTS.includes(answers.habitCount ?? 0) ? answers.habitCount! : DEFAULT_HABIT_COUNT;
  const queues = templates.map((t) => personalizedHabitIds(t, tagsForFocus(t, detail[t.key] ?? [])));
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

  // Recipes: only when the eat focus is chosen and a dietary profile is known.
  let dietaryTag: DietaryTag | undefined;
  let recommendedRecipeIds: string[] = [];
  if (goalKeys.includes('eat')) {
    const dietOption = (detail['eat'] ?? [])[0];
    dietaryTag = dietOption ? DIET_BY_OPTION[dietOption] : undefined;
    if (dietaryTag) {
      recommendedRecipeIds = recipesForDiet(dietaryTag).slice(0, 5).map((r) => r.id);
    }
  }

  const dragonId = DRAGONS.some((d) => d.id === answers.blocker) ? answers.blocker! : DEFAULT_DRAGON;

  return {
    goalKeys,
    habitIds,
    dragonId,
    recommendedProjectIds,
    recommendedRecipeIds,
    ...(dietaryTag ? { dietaryTag } : {}),
  };
}
