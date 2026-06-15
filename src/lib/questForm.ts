/**
 * Pure logic for the manual quest creator: validation + draft -> Quest mapping.
 * No AI, no React — fully unit-testable.
 */
import { QUEST_XP } from './leveling';
import { isValidScheduleMinutes } from './schedule';
import type { HabitMetric, Quest, QuestCategory, QuestDifficulty } from '@/types';

export interface QuestDraft {
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  /** Optional pinned time of day (minutes since local midnight, 0..1439). */
  scheduledTime?: number;
  /** Optional measurement (e.g. 'rating' for a 1–5 check-in at completion). */
  metric?: HabitMetric;
  /** The user's own reason this habit matters. */
  why?: string;
}

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 200;
export const WHY_MAX = 140;

export interface QuestDraftErrors {
  title?: string;
  description?: string;
  why?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: QuestDraftErrors;
}

/** Validate a draft. Title is required (1..80 after trim); description <=200. */
export function validateQuestDraft(draft: QuestDraft): ValidationResult {
  const errors: QuestDraftErrors = {};
  const title = draft.title.trim();

  if (title.length === 0) {
    errors.title = 'Give your quest a title.';
  } else if (title.length > TITLE_MAX) {
    errors.title = `Keep the title under ${TITLE_MAX} characters.`;
  }

  if (draft.description && draft.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  }

  if (draft.why && draft.why.trim().length > WHY_MAX) {
    errors.why = `Keep your reason under ${WHY_MAX} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Normalize a title for duplicate comparison (trim + lowercase + collapse spaces). */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Find an existing activity with the same title (case/space-insensitive), so the
 * UI can warn before adding a duplicate. `ignoreId` skips the quest being edited.
 */
export function findDuplicateActivity(
  quests: readonly Quest[],
  title: string,
  ignoreId?: string,
): Quest | undefined {
  const key = normalizeTitle(title);
  if (!key) return undefined;
  return quests.find((q) => q.id !== ignoreId && normalizeTitle(q.title) === key);
}

/** Convert a validated draft into a Quest (trims text, derives base XP). */
export function draftToQuest(draft: QuestDraft, id: string, completed = false): Quest {
  const description = draft.description?.trim();
  const why = draft.why?.trim();
  const title = draft.title.trim();
  return {
    id,
    title,
    ...(description ? { description } : {}),
    category: draft.category,
    difficulty: draft.difficulty,
    baseXp: QUEST_XP[draft.difficulty],
    completed,
    ...(isValidScheduleMinutes(draft.scheduledTime) ? { scheduledTime: draft.scheduledTime } : {}),
    ...(draft.metric ? { metric: draft.metric } : {}),
    ...(why ? { why } : {}),
    canonicalKey: normalizeTitle(title),
  };
}

/** The canonical dedup key for a quest (cached field, or derived from its title). */
export function questKey(quest: Pick<Quest, 'title' | 'canonicalKey'>): string {
  return quest.canonicalKey ?? normalizeTitle(quest.title);
}

/**
 * Pick the "best" survivor among same-key duplicates: prefer one done today /
 * most recently completed, then one with a pinned time, then the first.
 */
export function pickSurvivor(dupes: readonly Quest[]): Quest {
  return [...dupes].sort((a, b) => {
    const ad = a.lastCompletedDate ?? '';
    const bd = b.lastCompletedDate ?? '';
    if (ad !== bd) return bd.localeCompare(ad); // most recent completion first
    const at = a.scheduledTime !== undefined ? 0 : 1;
    const bt = b.scheduledTime !== undefined ? 0 : 1;
    return at - bt; // a pinned time wins
  })[0]!;
}

/**
 * Merge a group of same-key quests into one. Keeps the survivor's id but folds
 * in the best signal: completed-today, latest completion date, a scheduled time,
 * and a description if the survivor lacks one.
 */
export function mergeDuplicateGroup(dupes: readonly Quest[]): Quest {
  const survivor = pickSurvivor(dupes);
  const completed = dupes.some((q) => q.completed);
  const lastCompletedDate = dupes
    .map((q) => q.lastCompletedDate)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const scheduledTime = survivor.scheduledTime ?? dupes.find((q) => q.scheduledTime !== undefined)?.scheduledTime;
  const description = survivor.description ?? dupes.find((q) => q.description)?.description;
  return {
    ...survivor,
    completed,
    ...(lastCompletedDate ? { lastCompletedDate } : {}),
    ...(scheduledTime !== undefined ? { scheduledTime } : {}),
    ...(description ? { description } : {}),
    canonicalKey: questKey(survivor),
  };
}

/**
 * De-duplicate a quest list by canonical key. Returns the survivors (first
 * occurrence order preserved) plus a remap { oldId -> survivorId } so callers
 * can repoint plans, bucket assignments, etc. to the survivor.
 */
export function dedupeQuests(quests: readonly Quest[]): { quests: Quest[]; remap: Record<string, string> } {
  const groups = new Map<string, Quest[]>();
  const order: string[] = [];
  for (const q of quests) {
    const key = questKey(q);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(q);
  }
  const survivors: Quest[] = [];
  const remap: Record<string, string> = {};
  for (const key of order) {
    const group = groups.get(key)!;
    const merged = mergeDuplicateGroup(group);
    survivors.push(merged);
    for (const q of group) remap[q.id] = merged.id;
  }
  return { quests: survivors, remap };
}

/** Ensure every quest carries its canonical key (backfill without other changes). */
export function withCanonicalKeys(quests: readonly Quest[]): Quest[] {
  return quests.map((q) => (q.canonicalKey ? q : { ...q, canonicalKey: normalizeTitle(q.title) }));
}
