/**
 * Schema versioning + defensive migration for persisted state. Older or
 * partial records (e.g. saved before `lastCompletionDate` existed) are upgraded
 * to the current shape on read, so loads never crash on legacy data.
 */
import { companionStageForLevel, tierForLevel, QUEST_XP } from '@/lib/leveling';
import type { Character, Quest, QuestCategory, QuestDifficulty } from '@/types';
import { LOCAL_UID } from './seed';

export const SCHEMA_VERSION = 1;

const PRESENTATIONS = ['female', 'male', 'neutral'] as const;
const DIFFICULTIES: readonly QuestDifficulty[] = ['easy', 'medium', 'hard'];
const CATEGORIES: readonly QuestCategory[] = ['habit', 'workout', 'goal'];

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Upgrade an unknown persisted blob into a valid Character. */
export function migrateCharacter(raw: unknown): Character {
  const r = (raw ?? {}) as Partial<Character>;
  const level = Math.max(1, Math.floor(num(r.level, 1)));
  const xp = Math.max(0, num(r.xp, 0));
  const presentation = PRESENTATIONS.includes(r.presentation as never)
    ? (r.presentation as Character['presentation'])
    : 'neutral';

  return {
    id: str(r.id, LOCAL_UID),
    name: str(r.name, 'Hero'),
    presentation,
    level,
    xp,
    streakDays: Math.max(0, Math.floor(num(r.streakDays, 0))),
    lastCompletionDate:
      typeof r.lastCompletionDate === 'string' ? r.lastCompletionDate : undefined,
    // Re-derive from level so tier/companion can never drift out of sync.
    tier: tierForLevel(level),
    companionStage: companionStageForLevel(level),
  };
}

/** Upgrade an unknown persisted blob into a valid Quest list. */
export function migrateQuests(raw: unknown): Quest[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index): Quest => {
    const q = (item ?? {}) as Partial<Quest>;
    const difficulty = DIFFICULTIES.includes(q.difficulty as never)
      ? (q.difficulty as QuestDifficulty)
      : 'easy';
    const category = CATEGORIES.includes(q.category as never)
      ? (q.category as QuestCategory)
      : 'habit';
    return {
      id: str(q.id, `q${index + 1}`),
      title: str(q.title, 'Untitled quest'),
      category,
      difficulty,
      baseXp: num(q.baseXp, QUEST_XP[difficulty]),
      completed: q.completed === true,
    };
  });
}
