/**
 * Applies the questionnaire answers to a real, pre-populated app: creates the
 * hero, seeds the matching goals + habits (linked together), and persists the
 * recommended projects + attribution so the app is ready for the user's needs.
 * Reuses the canonical seeding APIs (same path as GoalEditorScreen.createFromTemplate),
 * so dedupe and persistence are handled for us.
 */
import { useCallback } from 'react';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useSettings } from '@/state/SettingsContext';
import { GOAL_TEMPLATES } from '@/data/goalTemplates';
import { HABIT_LIBRARY } from '@/data/habitLibrary';
import { buildStarterPlan, type OnboardingAnswers, type StarterPlan } from './starterPlan';
import type { HeroPresentation } from '@/types';

export interface ApplyOptions {
  answers: OnboardingAnswers;
  presentation: HeroPresentation;
  name?: string;
  attributionSource?: string;
}

export function useApplyStarterPlan(): (opts: ApplyOptions) => Promise<StarterPlan> {
  const { startGame, setName, addLibraryHabit } = useGame();
  const { addGoal, linkGoals } = useGoals();
  const { update } = useSettings();

  return useCallback(
    async ({ answers, presentation, name, attributionSource }: ApplyOptions) => {
      await startGame(presentation);
      if (name && name.trim()) await setName(name.trim());

      const plan = buildStarterPlan(answers);

      // Map each seeded habit to the first chosen goal that suggests it (for linking).
      const habitToGoalKey = new Map<string, string>();
      for (const key of plan.goalKeys) {
        const tpl = GOAL_TEMPLATES.find((t) => t.key === key);
        tpl?.suggestedHabitIds.forEach((id) => {
          if (!habitToGoalKey.has(id)) habitToGoalKey.set(id, key);
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
        const goalId = goalIdByKey.get(habitToGoalKey.get(habitId) ?? '');
        if (quest && goalId) await linkGoals([quest.id], goalId);
      }

      await update({
        onboardingCompleted: true,
        recommendedProjectIds: plan.recommendedProjectIds,
        ...(attributionSource ? { attributionSource } : {}),
        ...(answers.reminderTime ? { reminderTime: answers.reminderTime } : {}),
        onboardingAnswers: {
          focus: answers.focus,
          blocker: plan.dragonId,
          ...(answers.habitCount ? { habitCount: answers.habitCount } : {}),
          ...(answers.why ? { why: answers.why } : {}),
          ...(answers.reminderTime ? { reminderTime: answers.reminderTime } : {}),
        },
      });

      return plan;
    },
    [startGame, setName, addLibraryHabit, addGoal, linkGoals, update],
  );
}
