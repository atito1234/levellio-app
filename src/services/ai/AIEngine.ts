/**
 * Pluggable AI layer.
 *
 * Levellio supports three interchangeable engines behind one interface:
 *   1. Gemini        — cloud, default
 *   2. BYO key       — user supplies OpenAI / Anthropic / any key
 *   3. On-device     — privacy mode, data never leaves the device
 *
 * TODO(day5+): wire real network calls / on-device runtime. All adapters
 * currently return deterministic mock data so the UI can be built and tested
 * without any keys or network access.
 */
import type { QuestCategory, QuestDifficulty } from '@/types';

export type AIEngineId = 'gemini' | 'byo-key' | 'on-device';

export interface QuestSuggestionInput {
  /** Free-text goal or area the user wants to improve. */
  goal: string;
  category?: QuestCategory;
  /** Optional hint at how many suggestions to return. */
  count?: number;
}

export interface SuggestedQuest {
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}

export interface AIEngine {
  /** Stable identifier for the active engine. */
  readonly id: AIEngineId;
  /** Human-readable label for settings UI. */
  readonly label: string;
  /** Whether this engine keeps all data on-device. */
  readonly isPrivate: boolean;

  /** Turn a real-life goal into a set of suggested quests. */
  suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]>;

  /** A short motivational line for the celebration / dashboard. */
  motivate(context: { streakDays: number; level: number }): Promise<string>;
}
