import { useMemo } from 'react';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useGoals } from '@/state/GoalContext';
import { useActivityLog } from '@/state/useActivityLog';
import { buildMotivation, type MotivationMessage } from '@/lib/motivation';
import { activityStreakDays } from '@/lib/activityStreak';
import { byActivity, sessionsOf, summarize } from '@/lib/analytics';
import { planProgress } from '@/lib/plan';
import { dayKey } from '@/lib/dates';

/**
 * Personalized motivation line, composed on-device from the user's real history
 * and today's state. Honest by construction — only surfaces stats that exist.
 */
export function useMotivation(): MotivationMessage {
  const { character, quests } = useGame();
  const { getPlan } = usePlan();
  const { goals } = useGoals();
  const { events } = useActivityLog();

  return useMemo(() => {
    const now = new Date();
    const today = dayKey(now);
    const sessions = sessionsOf(events);
    const overall = summarize(sessions);
    const progress = planProgress(quests, getPlan(today));

    const top = byActivity(sessions)[0];
    const topActivity = top
      ? { title: top.title, streakDays: activityStreakDays(sessions, top.activityId, today) }
      : undefined;

    return buildMotivation({
      now,
      streakDays: character?.streakDays ?? 0,
      doneToday: progress.done,
      plannedToday: progress.total,
      hasHistory: sessions.length > 0,
      topActivity,
      bestWeekday: overall.bestWeekday,
      bestHour: overall.bestHour,
      goalTitles: goals.map((g) => g.title),
    });
  }, [character?.streakDays, quests, getPlan, goals, events]);
}
