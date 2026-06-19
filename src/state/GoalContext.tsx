import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useActivityLog } from '@/state/useActivityLog';
import { useSettings } from '@/state/SettingsContext';
import { goalStore } from '@/services/goal';
import { GoalLinkStore } from '@/services/goals/goalLinkStore';
import { AsyncStorageStore } from '@/services/storage';
import { goalHabits, goalProgress, goalWeeklyDays, type Goal, type GoalProgress } from '@/lib/goal';
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
  /** 'personal' (default) or 'project'. */
  kind?: 'personal' | 'project';
  /** The community project this goal mirrors (when kind === 'project'). */
  projectId?: string;
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
  /**
   * Effective member ids to pass to goalHabits(): explicit links, plus — for a
   * project goal in "full" prep mode — its supporting personal goals' habits.
   */
  membershipFor: (goalId: string) => Set<string>;
  linkGoal: (activityId: string, goalId: string) => Promise<void>;
  /** Link several habits into one goal in a SINGLE write (loop-safe). */
  linkGoals: (activityIds: readonly string[], goalId: string) => Promise<void>;
  unlinkGoal: (activityId: string, goalId: string) => Promise<void>;
  /** Set which personal goals "prepare" for a (project) goal. */
  setSupportingGoals: (goalId: string, supportingGoalIds: string[]) => Promise<void>;
}

const GoalContext = createContext<GoalContextValue | null>(null);

/** Owns the user's life goals (the "why" habits ladder up to). Mirrors PlanContext. */
export function GoalProvider({ children }: { children: React.ReactNode }) {
  const { user, quests } = useGame();
  const { settings } = useSettings();
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
        kind: input.kind ?? 'personal',
        ...(input.projectId ? { projectId: input.projectId } : {}),
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
  const linkGoals = useCallback(
    (activityIds: readonly string[], goalId: string) => {
      let next = goalLinks;
      for (const aid of activityIds) next = linkGoalPure(next, aid, goalId);
      return persistLinks(next);
    },
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

  const setSupportingGoals = useCallback(
    (goalId: string, supportingGoalIds: string[]) => {
      const ids = [...new Set(supportingGoalIds)];
      return commit(goals.map((g) => (g.id === goalId ? { ...g, supportingGoalIds: ids } : g)));
    },
    [goals, commit],
  );

  /**
   * Effective member ids for goalHabits(): explicit links, plus — for a project
   * goal in "full" prep mode — the category-matched habits of its supporting
   * personal goals (so prep work counts toward the project goal).
   */
  const membershipFor = useCallback(
    (goalId: string): Set<string> => {
      const out = new Set(habitsForGoalPure(goalLinks, goalId));
      const goal = goals.find((g) => g.id === goalId);
      if (goal?.kind === 'project' && settings.projectPrepLinkMode === 'full' && goal.supportingGoalIds?.length) {
        for (const sgId of goal.supportingGoalIds) {
          const sg = goals.find((g) => g.id === sgId);
          if (!sg) continue;
          for (const q of goalHabits(quests, sg, new Set(habitsForGoalPure(goalLinks, sg.id)))) out.add(q.id);
        }
      }
      return out;
    },
    [goalLinks, goals, quests, settings.projectPrepLinkMode],
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
      membershipFor,
      linkGoal,
      linkGoals,
      unlinkGoal,
      setSupportingGoals,
    }),
    [ready, goals, addGoal, updateGoal, removeGoal, reorderGoals, goalLinks, membershipFor, linkGoal, linkGoals, unlinkGoal, setSupportingGoals],
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoals(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoals must be used within a GoalProvider');
  return ctx;
}

/**
 * Honest, process-first progress for a goal, composed from the live contexts.
 * Pass `projectActivityIds` (from ProjectsContext) so personal goals exclude
 * project activities; project goals already use explicit membership only.
 */
export function useGoalProgress(goal: Goal, projectActivityIds?: ReadonlySet<string>): GoalProgress {
  const { quests } = useGame();
  const { getPlan } = usePlan();
  const { levels } = useCapacities();
  const { events } = useActivityLog();
  const { membershipFor } = useGoals();

  return useMemo(() => {
    const today = dayKey(new Date());
    const weekDays = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, -i));
    const weeklyDays = goalWeeklyDays(sessionsOf(events), goal, weekDays);
    return goalProgress({ goal, quests, plannedTodayIds: getPlan(today), levels, weeklyDays, linkedIds: membershipFor(goal.id), projectActivityIds });
  }, [goal, quests, getPlan, levels, events, membershipFor, projectActivityIds]);
}
