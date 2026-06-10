/**
 * Pure list operations for quest CRUD. Keeping these out of React makes the
 * create / edit / delete behavior unit-testable and reusable.
 */
import type { Quest } from '@/types';

export function addQuestToList(list: readonly Quest[], quest: Quest): Quest[] {
  return [...list, quest];
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
