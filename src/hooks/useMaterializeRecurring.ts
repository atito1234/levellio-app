/**
 * Materializes recurring habits (Quest.scheduledDays) into the given days' plans
 * exactly once per day. Call from screens that read the plan (Dashboard, Plan) so
 * a "repeat Mon/Wed/Fri" habit auto-appears on its days without a recurrence-aware
 * read path. Idempotent: once a day is materialized, user edits to it stick.
 */
import { useEffect } from 'react';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { recurringIdsForDay, weekdayOfKey } from '@/lib/recurrence';

export function useMaterializeRecurring(dayKeys: readonly string[]): void {
  const { quests } = useGame();
  const { ready, ensureMaterialized } = usePlan();

  // Signature of (day → recurring ids) so we re-run when the plan loads, the day
  // rolls over, or a habit's recurrence changes — but not on every render.
  const entries = dayKeys.map((dayKey) => ({ dayKey, ids: recurringIdsForDay(quests, weekdayOfKey(dayKey)) }));
  const signature = entries.map((e) => `${e.dayKey}:${e.ids.join(',')}`).join('|');

  useEffect(() => {
    if (!ready) return;
    void ensureMaterialized(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature]);
}
