import { generateRecipes } from './recipeGenerator';
import { parseGeminiRecipes } from './GeminiAdapter';
import type { AIEngine, RecipeSuggestionInput, SuggestedRecipe } from './AIEngine';

const baseEngine: AIEngine = {
  id: 'on-device',
  label: 'test',
  isPrivate: true,
  async suggestQuests() {
    return [];
  },
  async motivate() {
    return '';
  },
};

const RECIPE: SuggestedRecipe = {
  title: 'Test bowl',
  description: 'A test',
  ingredients: ['a', 'b'],
  steps: ['mix', 'eat'],
};

function withRecipes(fn: (input: RecipeSuggestionInput) => Promise<SuggestedRecipe[]>): AIEngine {
  return { ...baseEngine, suggestRecipes: fn };
}

describe('generateRecipes', () => {
  it('returns unavailable when the engine cannot generate recipes', async () => {
    const res = await generateRecipes(baseEngine, { dietary: 'vegan' });
    expect(res).toEqual({ recipes: [], source: 'unavailable' });
  });

  it('returns ai recipes when the engine succeeds', async () => {
    const res = await generateRecipes(withRecipes(async () => [RECIPE]), { dietary: 'vegan' });
    expect(res.source).toBe('ai');
    expect(res.recipes).toHaveLength(1);
  });

  it('falls back to unavailable on an empty result', async () => {
    const res = await generateRecipes(withRecipes(async () => []), {});
    expect(res).toEqual({ recipes: [], source: 'unavailable' });
  });

  it('falls back to unavailable on error', async () => {
    const res = await generateRecipes(withRecipes(async () => {
      throw new Error('boom');
    }), {});
    expect(res.source).toBe('unavailable');
  });

  it('falls back to unavailable on timeout', async () => {
    const res = await generateRecipes(
      withRecipes(() => new Promise(() => {})), // never resolves
      {},
      { timeoutMs: 10 },
    );
    expect(res.source).toBe('unavailable');
  });
});

describe('parseGeminiRecipes', () => {
  const wrap = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

  it('parses a valid JSON array response', () => {
    const data = wrap(
      JSON.stringify([
        { title: 'Curry', description: 'd', ingredients: ['x'], steps: ['s'], nutritionNote: 'n' },
      ]),
    );
    const recipes = parseGeminiRecipes(data);
    expect(recipes).toHaveLength(1);
    expect(recipes[0]!.title).toBe('Curry');
    expect(recipes[0]!.nutritionNote).toBe('n');
  });

  it('tolerates code-fenced JSON', () => {
    const data = wrap('```json\n[{"title":"A","ingredients":["x"],"steps":["s"]}]\n```');
    expect(parseGeminiRecipes(data)).toHaveLength(1);
  });

  it('throws when no usable recipes (missing ingredients/steps)', () => {
    const data = wrap(JSON.stringify([{ title: 'No body' }]));
    expect(() => parseGeminiRecipes(data)).toThrow();
  });

  it('throws when the response is not a list', () => {
    const data = wrap(JSON.stringify({ nope: true }));
    expect(() => parseGeminiRecipes(data)).toThrow();
  });
});
