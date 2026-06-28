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

/** Input for premium, personalized blocker coaching. */
export interface CoachSuggestionInput {
  dragonLabel: string;
  blockerLabel: string;
  habitTitle?: string;
  goalTitle?: string;
  recentMood?: string;
  minutesAvailable?: number;
}

/** AI-personalized coaching content (text only — evidence stays curated/honest). */
export interface CoachSuggestion {
  /** 3–5 Socratic prompts. */
  questions: string[];
  tactic: { name: string; how: string };
}

/** Input for AI recipe suggestions, tailored to the user's dietary profile. */
export interface RecipeSuggestionInput {
  /** Dietary profile (e.g. 'vegan', 'pescatarian'); free-form is tolerated. */
  dietary?: string;
  /** Optional goal/context hint (e.g. 'high-protein, quick weeknight meals'). */
  goal?: string;
  /** How many recipes to return (hint). */
  count?: number;
  /** Target language code for the generated text (e.g. 'en', 'es', 'fr'). */
  language?: string;
}

/** A single AI-generated recipe. Free-form text — never a fabricated citation. */
export interface SuggestedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  nutritionNote?: string;
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

  /**
   * Optional premium capability: personalized blocker coaching. Engines without
   * it (e.g. on-device) leave it undefined, forcing the curated fallback. May
   * throw when unavailable.
   */
  coach?(input: CoachSuggestionInput): Promise<CoachSuggestion>;

  /**
   * Optional: generate recipes tailored to a dietary profile. Cloud engines with
   * a key implement it; on-device leaves it undefined (→ curated fallback). May
   * throw when unavailable.
   */
  suggestRecipes?(input: RecipeSuggestionInput): Promise<SuggestedRecipe[]>;
}
