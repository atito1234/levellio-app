import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useActivityLog } from '@/state/useActivityLog';
import { goalStore } from '@/services/goal';
import { GoalLinkStore } from '@/services/goals/goalLinkStore';
import { AsyncStorageStore } from '@/services/storage';
import { goalProgress, goalWeeklyDays, type Goal, type GoalProgress } from '@/lib/goal';
import {
  EMPTY_GOAL_LINKS,
  goalsForHabit as goalsForHabitPure,
  habitsForGoal as habitsForGoalPure,
  linkGoal as linkGoalPure,
  unlinkGoal as unlinkGoalPure,
  unlinkGoalEverywhere,
  type GoalLinks,
} from '@/lib/goalLinks';
import { sessionsOf } from '@/lib/analytics';
import { dayKey, shiftDayKey } from '@/lib/dates';
import type { BucketColorId } from '@/lib/buckets';
import type { QuestCategory } from '@/types';

const goalLinkStore = new GoalLinkStore(new AsyncStorageStore());

let goalSeq = 0;
function genGoalId(): string {
  goalSeq += 1;
  return `goal-${Date.now()}-${goalSeq}`;
}

export interface NewGoalInput {
  title: string;
  emoji: string;
  colorId: BucketColorId;
  categories: QuestCategory[];
}

interface GoalContextValue {
  ready: boolean;
  goals: Goal[];
  addGoal: (input: NewGoalInput) => Promise<Goal | null>;
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  reorderGoals: (ids: string[]) => Promise<void>;
  /** Explicit habit→goal membership (on top of category matching). */
  goalLinks: GoalLinks;
  /** Goal ids a habit is explicitly tagged into. */
  goalsForHabit: (activityId: string) => string[];
  /** Habit ids explicitly tagged into a goal (as a Set, for goalHabits()). */
  habitIdsForGoal: (goalId: string) => Set<string>;
  linkGoal: (activityId: string, goalId: string) => Promise<void>;
  unlinkGoal: (activityId: string, goalId: string) => Promise<void>;
}

const GoalContext = createContext<GoalContextValue | null>(null);

/** Owns the user's life goals (the "why" habits ladder up to). Mirrors PlanContext. */
export function GoalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalLinks, setGoalLinks] = useState<GoalLinks>(EMPTY_GOAL_LINKS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setGoals([]);
      setGoalLinks(EMPTY_GOAL_LINKS);
      setReady(false);
      return;
    }
    Promise.all([goalStore.load(uid), goalLinkStore.load(uid)]).then(([loaded, links]) => {
      if (active) {
        setGoals(loaded);
        setGoalLinks(links);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const persistLinks = useCallback(
    async (next: GoalLinks) => {
      setGoalLinks(next);
      if (uid) await goalLinkStore.save(uid, next);
    },
    [uid],
  );

  const commit = useCallback(
    async (next: Goal[]) => {
      const ordered = next.map((g, i) => ({ ...g, order: i }));
      setGoals(ordered);
      if (uid) await goalStore.save(uid, ordered);
    },
    [uid],
  );

  const addGoal = useCallback(
    async (input: NewGoalInput): Promise<Goal | null> => {
      if (!uid || input.title.trim().length === 0) return null;
      const goal: Goal = {
        id: genGoalId(),
        title: input.title.trim(),
        emoji: input.emoji,
        colorId: input.colorId,
        categories: [...new Set(input.categories)],
        createdAt: Date.now(),
        order: goals.length,
      };
      await commit([...goals, goal]);
      return goal;
    },
    [uid, goals, commit],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<Goal, 'id'>>) =>
      commit(goals.map((g) => (g.id === id ? { ...g, ...patch, id: g.id } : g))),
    [goals, commit],
  );

  const removeGoal = useCallback(
    async (id: string) => {
      await commit(goals.filter((g) => g.id !== id));
      await persistLinks(unlinkGoalEverywhere(goalLinks, id));
    },
    [goals, commit, goalLinks, persistLinks],
  );

  const linkGoal = useCallback(
    (activityId: string, goalId: string) => persistLinks(linkGoalPure(goalLinks, activityId, goalId)),
    [goalLinks, persistLinks],
  );
  const unlinkGoal = useCallback(
    (activityId: string, goalId: string) => persistLinks(unlinkGoalPure(goalLinks, activityId, goalId)),
    [goalLinks, persistLinks],
  );

  const reorderGoals = useCallback(
    (ids: string[]) => {
      const byId = new Map(goals.map((g) => [g.id, g]));
      const next = ids.map((id) => byId.get(id)).filter((g): g is Goal => g !== undefined);
      return commit(next);
    },
    [goals, commit],
  );

  const value = useMemo<GoalContextValue>(
    () => ({
      ready,
      goals,
      addGoal,
      updateGoal,
      removeGoal,
      reorderGoals,
      goalLinks,
      goalsForHabit: (activityId: string) => goalsForHabitPure(goalLinks, activityId),
      habitIdsForGoal: (goalId: string) => new Set(habitsForGoalPure(goalLinks, goalId)),
      linkGoal,
      unlinkGoal,
    }),
    [ready, goals, addGoal, updateGoal, removeGoal, reorderGoals, goalLinks, linkGoal, unlinkGoal],
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoals(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoals must be used within a GoalProvider');
  return ctx;
}

/** Honest, process-first progress for a goal, composed from the live contexts. */
export function useGoalProgress(goal: Goal): GoalProgress {
  const { quests } = useGame();
  const { getPlan } = usePlan();
  const { levels } = useCapacities();
  const { events } = useActivityLog();
  const { habitIdsForGoal } = useGoals();

  return useMemo(() => {
    const today = dayKey(new Date());
    const weekDays = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i));
    const weeklyDays = goalWeeklyDays(sessionsOf(events), goal, weekDays);
    return goalProgress({ goal, quests, plannedTodayIds: getPlan(today), levels, weeklyDays, linkedIds: habitIdsForGoal(goal.id) });
    // habitIdsForGoal is derived from goalLinks; recompute when it changes.
  }, [goal, quests, getPlan, levels, events, habitIdsForGoal]);
}
