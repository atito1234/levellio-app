/**
 * Resilient AI recipe generation. Calls the active engine within a time budget
 * and NEVER throws: on timeout, error, offline, an empty result, or an engine
 * that can't generate (on-device), it returns `{ recipes: [], source:
 * 'unavailable' }`. Callers keep showing the curated catalog as the fallback.
 * Mirrors questGenerator/coachGenerator.
 */
import { AITimeoutError } from './errors';
import type { AIEngine, RecipeSuggestionInput, SuggestedRecipe } from './AIEngine';

export type RecipeSource = 'ai' | 'unavailable';

export interface GenerateRecipesResult {
  recipes: SuggestedRecipe[];
  source: RecipeSource;
}

export interface GenerateRecipesOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 12000;

export async function generateRecipes(
  engine: AIEngine,
  input: RecipeSuggestionInput,
  options: GenerateRecipesOptions = {},
): Promise<GenerateRecipesResult> {
  if (!engine.suggestRecipes) return { recipes: [], source: 'unavailable' };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const recipes = await withTimeout(engine.suggestRecipes(input), timeoutMs);
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return { recipes: [], source: 'unavailable' };
    }
    return { recipes, source: 'ai' };
  } catch {
    return { recipes: [], source: 'unavailable' };
  }
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
