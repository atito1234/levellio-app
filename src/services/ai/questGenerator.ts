/**
 * Resilient AI quest generation. Calls the active engine with a time budget and
 * ALWAYS returns usable quests: on timeout, error, offline, or an empty result
 * it returns a deterministic fallback set so the UI never breaks.
 */
import { AITimeoutError } from './errors';
import { QUEST_XP } from '@/lib/leveling';
import type { AIEngine, QuestSuggestionInput, SuggestedQuest } from './AIEngine';
import type { Quest } from '@/types';

/** Deterministic, offline-safe quests used when the AI is unavailable. */
export const FALLBACK_QUESTS: readonly SuggestedQuest[] = [
  { title: 'Drink a glass of water', category: 'habit', difficulty: 'easy' },
  { title: 'Take a 15-minute walk', category: 'workout', difficulty: 'medium' },
  { title: 'Spend 25 focused minutes on your top goal', category: 'goal', difficulty: 'hard' },
];

export type QuestSource = 'ai' | 'fallback';

export interface GenerateResult {
  quests: SuggestedQuest[];
  source: QuestSource;
}

export interface GenerateOptions {
  timeoutMs?: number;
  count?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function generateQuests(
  engine: AIEngine,
  input: QuestSuggestionInput,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const suggestions = await withTimeout(engine.suggestQuests(input), timeoutMs);
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return { quests: fallback(input, options.count), source: 'fallback' };
    }
    return { quests: trim(suggestions, options.count), source: 'ai' };
  } catch {
    return { quests: fallback(input, options.count), source: 'fallback' };
  }
}

/** Convert a suggestion into a concrete Quest with the correct base XP. */
export function suggestedToQuest(suggestion: SuggestedQuest, id: string): Quest {
  return {
    id,
    title: suggestion.title,
    category: suggestion.category,
    difficulty: suggestion.difficulty,
    baseXp: QUEST_XP[suggestion.difficulty],
    completed: false,
  };
}

function fallback(input: QuestSuggestionInput, count?: number): SuggestedQuest[] {
  const filtered = input.category
    ? FALLBACK_QUESTS.filter((q) => q.category === input.category)
    : FALLBACK_QUESTS;
  const list = filtered.length > 0 ? filtered : FALLBACK_QUESTS;
  return trim(list, count);
}

function trim(list: readonly SuggestedQuest[], count?: number): SuggestedQuest[] {
  if (!count || count >= list.length) return [...list];
  return list.slice(0, Math.max(1, count));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AITimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
