/**
 * Pure list operations for quest CRUD. Keeping these out of React makes the
 * create / edit / delete behavior unit-testable and reusable.
 */
import type { Quest } from '@/types';
import { questKey } from './questForm';

export function addQuestToList(list: readonly Quest[], quest: Quest): Quest[] {
  return [...list, quest];
}

/**
 * Add a quest, MERGING into an existing same-canonical-key quest instead of
 * appending a duplicate. This is the single safe insert all create paths use, so
 * adding the same activity twice (manual, AI, or library) can never pile up.
 *
 * On a merge we keep the EXISTING quest (its id + base fields, so plan/bucket
 * links survive) and only fold in the incoming completion/schedule/description
 * signal. Returns the new list, the canonical quest, and whether a merge happened.
 */
export function upsertQuestByCanonical(
  list: readonly Quest[],
  incoming: Quest,
): { quests: Quest[]; quest: Quest; merged: boolean } {
  const key = questKey(incoming);
  const existing = list.find((q) => questKey(q) === key);
  if (!existing) {
    const quest = { ...incoming, canonicalKey: key };
    return { quests: [...list, quest], quest, merged: false };
  }
  const lastCompletedDate = [existing.lastCompletedDate, incoming.lastCompletedDate]
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const scheduledTime = existing.scheduledTime ?? incoming.scheduledTime;
  const description = existing.description ?? incoming.description;
  const merged: Quest = {
    ...existing,
    completed: existing.completed || incoming.completed,
    canonicalKey: key,
    ...(lastCompletedDate ? { lastCompletedDate } : {}),
    ...(scheduledTime !== undefined ? { scheduledTime } : {}),
    ...(description ? { description } : {}),
  };
  return { quests: list.map((q) => (q.id === existing.id ? merged : q)), quest: merged, merged: true };
}

/** Replace mutable fields of a quest by id; preserves id and completion state. */
export function updateQuestInList(
  list: readonly Quest[],
  id: string,
  patch: Partial<Omit<Quest, 'id'>>,
): Quest[] {
  return list.map((q) => (q.id === id ? { ...q, ...patch, id: q.id } : q));
}

export function removeQuestFromList(list: readonly Quest[], id: string): Quest[] {
  return list.filter((q) => q.id !== id);
}
