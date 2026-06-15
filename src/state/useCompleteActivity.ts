import { useCallback } from 'react';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useGoals } from '@/state/GoalContext';
import { useMilestones } from '@/state/MilestonesContext';
import { useActivityLog } from '@/state/useActivityLog';
import { useSettings } from '@/state/SettingsContext';
import { captureLocationSafely } from '@/services/sensors/deviceContext';
import { applyDeltas } from '@/lib/compounding';
import { rippleForQuest } from '@/lib/habitCapacity';
import { activityStreakDays } from '@/lib/activityStreak';
import { detectMilestones } from '@/lib/milestones';
import { questKey } from '@/lib/questForm';
import { sessionsOf } from '@/lib/analytics';
import { dayKey } from '@/lib/dates';
import type { Quest, QuestReward } from '@/types';

export interface CompletionOpts {
  method: 'timer' | 'pomodoro' | 'manual';
  /** Actual seconds spent (0 for a manual log). */
  durationSec: number;
  /** Self-reported 1–5 "how did it go?", for habits that opt into a rating. */
  rating?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Single completion entry point shared by the Ripple and the activity timer:
 * completes the quest once, then ripples into capacities, the bucket
 * contribution, and a rich (privacy-gated) session record. Returns the reward,
 * or null if it was already done today.
 */
export function useCompleteActivity(): (quest: Quest, opts: CompletionOpts) => Promise<QuestReward | null> {
  const { completeQuest } = useGame();
  const { recordContribution, recordSession } = useBuckets();
  const { recordCompletion, levels } = useCapacities();
  const { goals } = useGoals();
  const { earnedIds, recordMilestones } = useMilestones();
  const { events } = useActivityLog();
  const { settings } = useSettings();
  const includeLocation = settings.metadataPrivacy.includeLocation;

  return useCallback(
    async (quest: Quest, opts: CompletionOpts): Promise<QuestReward | null> => {
      const reward = await completeQuest(quest.id);
      if (!reward) return null; // already completed today / not found
      await recordContribution({ id: quest.id, category: quest.category, difficulty: quest.difficulty, xp: reward.totalXp });
      await recordCompletion(quest);
      const location = await captureLocationSafely(includeLocation);
      await recordSession({
        activityId: quest.id,
        title: quest.title,
        category: quest.category,
        method: opts.method,
        durationSec: opts.durationSec,
        ...(location ? { location } : {}),
        ...(opts.rating ? { rating: opts.rating } : {}),
      });

      // Detect & celebrate milestones from this completion. prevLevels is the
      // pre-ripple snapshot; postLevels mirrors what recordCompletion applied.
      const now = Date.now();
      const today = dayKey(new Date(now));
      const postLevels = applyDeltas(levels, rippleForQuest(quest));
      const augmented = [...sessionsOf(events), { activityId: quest.id, createdAt: now }];
      const activityStreak = activityStreakDays(augmented, quest.id, today);
      const contributingGoalIds = goals.filter((g) => g.categories.includes(quest.category)).map((g) => g.id);
      const milestones = detectMilestones({
        earnedIds,
        now,
        streakDays: reward.streakDays,
        activity: { canonicalKey: questKey(quest), title: quest.title, streakDays: activityStreak },
        prevLevels: levels,
        levels: postLevels,
        goals,
        contributingGoalIds,
      });
      if (milestones.length > 0) await recordMilestones(milestones);

      return reward;
    },
    [completeQuest, recordContribution, recordCompletion, recordSession, includeLocation, levels, events, goals, earnedIds, recordMilestones],
  );
}
