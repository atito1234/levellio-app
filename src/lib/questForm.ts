/**
 * Pure logic for the manual quest creator: validation + draft -> Quest mapping.
 * No AI, no React — fully unit-testable.
 */
import { QUEST_XP } from './leveling';
import type { Quest, QuestCategory, QuestDifficulty } from '@/types';

export interface QuestDraft {
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 200;

export interface QuestDraftErrors {
  title?: string;
  description?: string;
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
  return {
    id,
    title: draft.title.trim(),
    ...(description ? { description } : {}),
    category: draft.category,
    difficulty: draft.difficulty,
    baseXp: QUEST_XP[draft.difficulty],
    completed,
  };
}
