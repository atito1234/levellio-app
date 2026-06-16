import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useActivityLog } from '@/state/useActivityLog';
import { goalStore } from '@/services/goal';
import { goalProgress, goalWeeklyDays, type Goal, type GoalProgress } from '@/lib/goal';
import { sessionsOf } from '@/lib/analytics';
import { dayKey, shiftDayKey } from '@/lib/dates';
import type { BucketColorId } from '@/lib/buckets';
import type { QuestCategory } from '@/types';

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
}

const GoalContext = createContext<GoalContextValue | null>(null);

/** Owns the user's life goals (the "why" habits ladder up to). Mirrors PlanContext. */
export function GoalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setGoals([]);
      setReady(false);
      return;
    }
    goalStore.load(uid).then((loaded) => {
      if (active) {
        setGoals(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

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

  const removeGoal = useCallback((id: string) => commit(goals.filter((g) => g.id !== id)), [goals, commit]);

  const reorderGoals = useCallback(
    (ids: string[]) => {
      const byId = new Map(goals.map((g) => [g.id, g]));
      const next = ids.map((id) => byId.get(id)).filter((g): g is Goal => g !== undefined);
      return commit(next);
    },
    [goals, commit],
  );

  const value = useMemo<GoalContextValue>(
    () => ({ ready, goals, addGoal, updateGoal, removeGoal, reorderGoals }),
    [ready, goals, addGoal, updateGoal, removeGoal, reorderGoals],
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

  return useMemo(() => {
    const today = dayKey(new Date());
    const weekDays = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i));
    const weeklyDays = goalWeeklyDays(sessionsOf(events), goal, weekDays);
    return goalProgress({ goal, quests, plannedTodayIds: getPlan(today), levels, weeklyDays });
  }, [goal, quests, getPlan, levels, events]);
}
