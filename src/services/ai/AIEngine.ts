/**
 * Pluggable AI layer.
 *
 * Three interchangeable engines sit behind one interface:
 *   1. Gemini     — cloud, default
 *   2. BYO key    — user supplies OpenAI / Anthropic / any key at runtime
 *   3. On-device  — privacy mode: NO network I/O, data never leaves the device
 *
 * Cloud adapters receive an injectable `HttpClient` (the only network seam),
 * which makes them testable AND lets the on-device adapter be constructed with
 * no network client at all — structurally guaranteeing the privacy contract.
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

export interface AIHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/** Network seam for cloud adapters. On-device adapters never receive one. */
export type HttpClient = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<AIHttpResponse>;

export interface AIEngine {
  /** Stable identifier for the active engine. */
  readonly id: AIEngineId;
  /** Human-readable label for settings UI. */
  readonly label: string;
  /**
   * PRIVACY CONTRACT: when `true`, the engine performs NO network I/O and no
   * user data ever leaves the device. On-device adapters MUST set this `true`
   * and MUST NOT hold an HttpClient.
   */
  readonly isPrivate: boolean;

  /** Turn a real-life goal into suggested quests. May throw when unavailable. */
  suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]>;

  /** A short motivational line. Low-stakes; should not block gameplay. */
  motivate(context: { streakDays: number; level: number }): Promise<string>;
}
