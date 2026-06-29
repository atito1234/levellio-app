/**
 * Assembles the real numbers behind every achievement (and the session log its
 * evidence builders need) from existing contexts + analytics libs. No new storage.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useBattles } from '@/state/BattlesContext';
import { useProjects } from '@/state/ProjectsContext';
import { useActivityLog } from '@/state/useActivityLog';
import { sessionsOf, summarize, weekdayLabel, hourLabel } from '@/lib/analytics';
import { daysAccomplished, longestDayStreak } from '@/lib/heroAnalytics';
import { activityStreakDays, SOLIDIFY_DAYS } from '@/lib/activityStreak';
import { activityJourney, activityWeeklyAdherence, HABIT_DAYS } from '@/lib/journey';
import { CAPACITIES } from '@/lib/compounding';
import { dayKey } from '@/lib/dates';
import type { AchievementStats, AchievementEvidenceCtx } from '@/lib/achievements';
import type { ActivitySessionEvent } from '@/lib/metadata';

export function useAchievementStats(): AchievementEvidenceCtx {
  const { t, i18n } = useTranslation(['common', 'capacities']);
  const { character, quests } = useGame();
  const { goals } = useGoals();
  const { levels } = useCapacities();
  const { totalSlain, ritesPerformed } = useBattles();
  const { myProjects } = useProjects();
  const { events } = useActivityLog();

  const sessions = useMemo(() => sessionsOf(events), [events]);
  const todayKey = dayKey(new Date());
  const weekdayNames = (t('common:weekdaysShort', { returnObjects: true }) as string[]) ?? [];

  const stats = useMemo<AchievementStats>(() => {
    // Per-activity streaks → solidified/graduated counts + the strongest habit.
    let solidifiedCount = 0;
    let graduatedCount = 0;
    let topId: string | null = null;
    let topStreak = -1;
    for (const q of quests) {
      const streak = activityStreakDays(sessions, q.id, todayKey);
      if (streak >= SOLIDIFY_DAYS) solidifiedCount += 1;
      if (streak >= HABIT_DAYS) graduatedCount += 1;
      if (streak > topStreak) {
        topStreak = streak;
        topId = q.id;
      }
    }

    let topActivity: AchievementStats['topActivity'];
    if (topId) {
      const q = quests.find((x) => x.id === topId)!;
      const j = activityJourney(sessions, q.id, q.title, todayKey);
      const weekly = activityWeeklyAdherence(sessions, q.id, todayKey, 8);
      const sum = summarize(sessions.filter((s) => s.activityId === q.id));
      topActivity = {
        id: q.id,
        title: q.title,
        streak: j.currentStreak,
        weeklyPct: Math.round((weekly[weekly.length - 1] ?? 0) * 100),
        totalDays: j.totalDays,
        ...(sum.bestWeekday !== null ? { bestWeekdayLabel: weekdayLabel(sum.bestWeekday, weekdayNames) } : {}),
        ...(sum.bestHour !== null ? { bestHourLabel: hourLabel(sum.bestHour, i18n.language) } : {}),
      };
    }

    // Strongest capacity ring.
    let maxCapacityLevel = 0;
    let maxedCapacityId: string | null = null;
    for (const cap of CAPACITIES) {
      const lvl = Math.round(levels[cap.id] ?? 0);
      if (lvl > maxCapacityLevel) {
        maxCapacityLevel = lvl;
        maxedCapacityId = cap.id;
      }
    }

    return {
      completions: sessions.length,
      daysAccomplished: daysAccomplished(sessions),
      longestStreak: longestDayStreak(sessions),
      currentStreak: character?.streakDays ?? 0,
      solidifiedCount,
      graduatedCount,
      ...(topActivity ? { topActivity } : {}),
      maxCapacityLevel,
      ...(maxedCapacityId ? { maxedCapacityName: t(`capacities:${maxedCapacityId}`, { defaultValue: maxedCapacityId }) } : {}),
      goalsCount: goals.length,
      battlesSlain: totalSlain,
      ritesPerformed,
      projectsJoined: myProjects.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, quests, levels, goals.length, totalSlain, ritesPerformed, myProjects.length, character?.streakDays, todayKey]);

  return { stats, sessions: sessions as readonly ActivitySessionEvent[], todayKey };
}
