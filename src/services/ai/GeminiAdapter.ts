/**
 * Gemini engine — uses the USER'S OWN API key (we do not ship a developer key).
 * The key is read at runtime from secure storage via `getApiKey`. Without a key
 * it throws AIUnavailableError so the generator falls back gracefully.
 */
import { AIUnavailableError } from './errors';
import { fetchHttpClient } from './http';
import { mockMotivate } from './mockData';
import { resolveCategory } from '@/lib/categories';
import type { QuestDifficulty } from '@/types';
import type {
  AIEngine,
  HttpClient,
  QuestSuggestionInput,
  RecipeSuggestionInput,
  SuggestedQuest,
  SuggestedRecipe,
} from './AIEngine';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface GeminiDeps {
  getApiKey: () => Promise<string | null>;
  http?: HttpClient;
}

export class GeminiAdapter implements AIEngine {
  readonly id = 'gemini' as const;
  readonly label = 'Gemini (your own key)';
  readonly isPrivate = false;

  constructor(private readonly deps: GeminiDeps) {}

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    const key = await this.deps.getApiKey();
    if (!key) throw new AIUnavailableError('No Gemini API key configured');

    const http = this.deps.http ?? fetchHttpClient();
    const res = await http(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest(input)),
    });
    if (!res.ok) throw new AIUnavailableError(`Gemini request failed (${res.status})`);

    return parseGeminiSuggestions(await res.json());
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    // Motivational copy is low-stakes; keep it offline-safe.
    return mockMotivate(context);
  }

  async suggestRecipes(input: RecipeSuggestionInput): Promise<SuggestedRecipe[]> {
    const key = await this.deps.getApiKey();
    if (!key) throw new AIUnavailableError('No Gemini API key configured');

    const http = this.deps.http ?? fetchHttpClient();
    const res = await http(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRecipeRequest(input)),
    });
    if (!res.ok) throw new AIUnavailableError(`Gemini request failed (${res.status})`);

    return parseGeminiRecipes(await res.json());
  }
}

function buildRecipeRequest(input: RecipeSuggestionInput): unknown {
  const count = input.count ?? 3;
  const dietary = input.dietary?.trim() ? input.dietary.trim() : 'no specific';
  const lang = input.language?.trim() ? input.language.trim() : 'en';
  const goal = input.goal?.trim() ? ` Focus: ${input.goal.trim()}.` : '';
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `Suggest ${count} simple, healthy recipes for a ${dietary} diet.${goal} ` +
              `Write all text in the language with code "${lang}". ` +
              'Respond with ONLY a JSON array of objects, each having "title" (string), ' +
              '"description" (short string), "ingredients" (array of strings), "steps" ' +
              '(array of strings), and "nutritionNote" (short string). ' +
              'Keep ingredients honest and do not invent medical claims.',
          },
        ],
      },
    ],
  };
}

/**
 * Parse a Gemini response into SuggestedRecipe[]. Mirrors parseGeminiSuggestions:
 * navigates the response path, tolerates code-fenced JSON, validates each item,
 * and throws on an unexpected shape so callers fall back gracefully.
 */
export function parseGeminiRecipes(data: unknown): SuggestedRecipe[] {
  const text = extractGeminiText(data);
  const parsed: unknown = JSON.parse(stripCodeFences(text));
  if (!Array.isArray(parsed)) {
    throw new AIUnavailableError('Gemini did not return a list');
  }
  const recipes = parsed.map(toSuggestedRecipe).filter((r): r is SuggestedRecipe => r !== null);
  if (recipes.length === 0) {
    throw new AIUnavailableError('No usable recipes in Gemini response');
  }
  return recipes;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

function toSuggestedRecipe(item: unknown): SuggestedRecipe | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as {
    title?: unknown;
    description?: unknown;
    ingredients?: unknown;
    steps?: unknown;
    nutritionNote?: unknown;
  };
  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) return null;
  const ingredients = toStringArray(obj.ingredients);
  const steps = toStringArray(obj.steps);
  if (ingredients.length === 0 || steps.length === 0) return null;
  return {
    title: obj.title.trim(),
    description: typeof obj.description === 'string' ? obj.description.trim() : '',
    ingredients,
    steps,
    ...(typeof obj.nutritionNote === 'string' && obj.nutritionNote.trim().length > 0
      ? { nutritionNote: obj.nutritionNote.trim() }
      : {}),
  };
}

function buildRequest(input: QuestSuggestionInput): unknown {
  const count = input.count ?? 3;
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `Suggest ${count} short real-life quests for the goal "${input.goal}". ` +
              'Respond with ONLY a JSON array of objects, each having "title" (string), ' +
              '"category" (one of fitness, mind, learning, health, productivity, ' +
              'relationships, creativity, finance), and "difficulty" (easy, medium, hard).',
          },
        ],
      },
    ],
  };
}

/**
 * Parse a real-shaped Gemini response into SuggestedQuest[]. Navigates the
 * documented response path, tolerates code-fenced JSON, and validates each
 * item. Throws on any unexpected shape so callers fall back to FALLBACK_QUESTS.
 */
export function parseGeminiSuggestions(data: unknown): SuggestedQuest[] {
  const text = extractGeminiText(data);
  const parsed: unknown = JSON.parse(stripCodeFences(text));
  if (!Array.isArray(parsed)) {
    throw new AIUnavailableError('Gemini did not return a list');
  }
  const suggestions = parsed
    .map(toSuggestedQuest)
    .filter((q): q is SuggestedQuest => q !== null);
  if (suggestions.length === 0) {
    throw new AIUnavailableError('No usable suggestions in Gemini response');
  }
  return suggestions;
}

function extractGeminiText(data: unknown): string {
  const root = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };
  const text = root?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new AIUnavailableError('Empty Gemini response');
  }
  return text;
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function toSuggestedQuest(item: unknown): SuggestedQuest | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as { title?: unknown; category?: unknown; difficulty?: unknown };
  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) return null;
  const difficulty: QuestDifficulty =
    obj.difficulty === 'easy' || obj.difficulty === 'medium' || obj.difficulty === 'hard'
      ? obj.difficulty
      : 'medium';
  return {
    title: obj.title.trim(),
    category: resolveCategory(obj.category, 'productivity'),
    difficulty,
  };
}
