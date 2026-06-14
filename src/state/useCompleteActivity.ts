import { useCallback } from 'react';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useSettings } from '@/state/SettingsContext';
import { captureLocationSafely } from '@/services/sensors/deviceContext';
import type { Quest, QuestReward } from '@/types';

export interface CompletionOpts {
  method: 'timer' | 'pomodoro' | 'manual';
  /** Actual seconds spent (0 for a manual log). */
  durationSec: number;
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
  const { recordCompletion } = useCapacities();
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
        category: quest.category,
        method: opts.method,
        durationSec: opts.durationSec,
        ...(location ? { location } : {}),
      });
      return reward;
    },
    [completeQuest, recordContribution, recordCompletion, recordSession, includeLocation],
  );
}
