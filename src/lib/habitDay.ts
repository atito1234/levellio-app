/**
 * Daily-habit rollover. Habits are daily by nature: a completion counts only for
 * the calendar day it happened. `completed` is therefore a *derived* "done
 * today" flag — at each new day it resets to open so the habit can be done again
 * (and its ring re-opens, restoring the completion pull). Pure + deterministic;
 * callers pass today's key via `dayKey(new Date())`.
 */
import type { Quest } from '@/types';

/** Whether a habit's last completion was today. */
export function isDoneToday(quest: Pick<Quest, 'lastCompletedDate'>, todayKey: string): boolean {
  return quest.lastCompletedDate === todayKey;
}

/**
 * Reconcile each quest's `completed` flag with "was it completed today?".
 * Returns the same array reference when nothing changed (cheap no-op on most
 * renders).
 */
export function rolloverQuests(
  quests: readonly Quest[],
  todayKey: string,
): { quests: Quest[]; changed: boolean } {
  let changed = false;
  const next = quests.map((q) => {
    const doneToday = q.lastCompletedDate === todayKey;
    if (q.completed !== doneToday) {
      changed = true;
      return { ...q, completed: doneToday };
    }
    return q;
  });
  return { quests: changed ? next : (quests as Quest[]), changed };
}

/** Mark a single quest done for `todayKey` (sets the flag + the date stamp). */
export function markQuestDoneToday(quests: readonly Quest[], questId: string, todayKey: string): Quest[] {
  return quests.map((q) => (q.id === questId ? { ...q, completed: true, lastCompletedDate: todayKey } : q));
}
