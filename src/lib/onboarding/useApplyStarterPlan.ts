/**
 * Applies the questionnaire answers to a real app — split into two phases so the
 * user can choose whether we pre-seed their plan:
 *
 *   prepare(opts) → always run at the "building" beat. Creates the hero, computes
 *     the plan, and persists answers + recommendation lists + onboardingCompleted.
 *     Seeds NO goals/habits/recipes, so the app is usable either way.
 *   seed(plan)    → run ONLY if the user taps "Add my plan" at the reveal. Creates
 *     the goals + habits (linked) and saves the recommended recipes.
 *
 * Reuses the canonical seeding APIs (same path as GoalEditorScreen.createFromTemplate),
 * so dedupe and persistence are handled for us.
 */
import { useCallback } from 'react';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useSettings } from '@/state/SettingsContext';
import { useRecipes } from '@/state/RecipesContext';
import { GOAL_TEMPLATES } from '@/data/goalTemplates';
import { HABIT_LIBRARY } from '@/data/habitLibrary';
import { buildStarterPlan, type OnboardingAnswers, type StarterPlan } from './starterPlan';
import type { HeroPresentation } from '@/types';

export interface PrepareOptions {
  answers: OnboardingAnswers;
  presentation: HeroPresentation;
  name?: string;
  attributionSource?: string;
}

export interface StarterPlanApplier {
  /** Create the hero + persist answers/recommendations. Returns the computed plan. */
  prepare: (opts: PrepareOptions) => Promise<StarterPlan>;
  /** Seed goals + habits + recipes from the plan (only when the user opts in). */
  seed: (plan: StarterPlan) => Promise<void>;
}

export function useApplyStarterPlan(): StarterPlanApplier {
  const { startGame, setName, addLibraryHabit } = useGame();
  const { addGoal, linkGoals } = useGoals();
  const { update } = useSettings();
  const { saveMany } = useRecipes();

  const prepare = useCallback(
    async ({ answers, presentation, name, attributionSource }: PrepareOptions) => {
      await startGame(presentation);
      if (name && name.trim()) await setName(name.trim());

      const plan = buildStarterPlan(answers);

      await update({
        onboardingCompleted: true,
        recommendedProjectIds: plan.recommendedProjectIds,
        recommendedRecipeIds: plan.recommendedRecipeIds,
        ...(attributionSource ? { attributionSource } : {}),
        ...(answers.reminderTime ? { reminderTime: answers.reminderTime } : {}),
        onboardingAnswers: {
          focus: answers.focus,
          blocker: plan.dragonId,
          ...(answers.focusDetail ? { focusDetail: answers.focusDetail } : {}),
          ...(plan.dietaryTag ? { dietaryTag: plan.dietaryTag } : {}),
          ...(answers.habitCount ? { habitCount: answers.habitCount } : {}),
          ...(answers.why ? { why: answers.why } : {}),
          ...(answers.reminderTime ? { reminderTime: answers.reminderTime } : {}),
        },
      });

      return plan;
    },
    [startGame, setName, update],
  );

  const seed = useCallback(
    async (plan: StarterPlan) => {
      // Map each seeded habit to the first chosen goal that suggests it (for linking).
      const habitToGoalKey = new Map<string, string>();
      for (const key of plan.goalKeys) {
        const tpl = GOAL_TEMPLATES.find((t) => t.key === key);
        tpl?.suggestedHabitIds.forEach((id) => {
          if (!habitToGoalKey.has(id)) habitToGoalKey.set(id, key);
        });
      }
      // Tailored habits (from follow-ups) may not be in a template's base list;
      // fall back to matching the habit's category to a chosen goal.
      const goalKeyByCategory = new Map<string, string>();
      for (const key of plan.goalKeys) {
        const tpl = GOAL_TEMPLATES.find((t) => t.key === key);
        tpl?.categories.forEach((c) => {
          if (!goalKeyByCategory.has(c)) goalKeyByCategory.set(c, key);
        });
      }

      // Create the goals.
      const goalIdByKey = new Map<string, string>();
      for (const key of plan.goalKeys) {
        const tpl = GOAL_TEMPLATES.find((t) => t.key === key);
        if (!tpl) continue;
        const goal = await addGoal({ title: tpl.title, emoji: tpl.emoji, colorId: tpl.colorId, categories: tpl.categories });
        if (goal) goalIdByKey.set(key, goal.id);
      }

      // Seed the habits and link each to its goal.
      for (const habitId of plan.habitIds) {
        const habit = HABIT_LIBRARY.find((h) => h.id === habitId);
        if (!habit) continue;
        const quest = await addLibraryHabit(habit);
        const goalKey = habitToGoalKey.get(habitId) ?? goalKeyByCategory.get(habit.category);
        const goalId = goalKey ? goalIdByKey.get(goalKey) : undefined;
        if (quest && goalId) await linkGoals([quest.id], goalId);
      }

      // Save the recommended recipes into the user's collection.
      if (plan.recommendedRecipeIds.length) await saveMany(plan.recommendedRecipeIds);
    },
    [addGoal, addLibraryHabit, linkGoals, saveMany],
  );

  return { prepare, seed };
}
