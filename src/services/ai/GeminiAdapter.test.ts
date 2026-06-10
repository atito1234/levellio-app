import { GeminiAdapter, parseGeminiSuggestions } from './GeminiAdapter';
import { generateQuests } from './questGenerator';
import type { AIHttpResponse, HttpClient } from './AIEngine';

function geminiResponse(text: string): unknown {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

function httpReturning(data: unknown, ok = true, status = 200): HttpClient {
  return async (): Promise<AIHttpResponse> => ({ ok, status, json: async () => data });
}

describe('parseGeminiSuggestions', () => {
  it('parses a valid JSON array response', () => {
    const text = JSON.stringify([
      { title: 'Run 5km', category: 'fitness', difficulty: 'hard' },
      { title: 'Read', category: 'learning', difficulty: 'easy' },
    ]);
    const out = parseGeminiSuggestions(geminiResponse(text));
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ title: 'Run 5km', category: 'fitness', difficulty: 'hard' });
  });

  it('tolerates ```json code fences', () => {
    const text = '```json\n[{"title":"Meditate","category":"mind","difficulty":"easy"}]\n```';
    expect(parseGeminiSuggestions(geminiResponse(text))).toHaveLength(1);
  });

  it('coerces invalid category/difficulty to safe defaults', () => {
    const text = JSON.stringify([{ title: 'X', category: 'bogus', difficulty: 'impossible' }]);
    const out = parseGeminiSuggestions(geminiResponse(text));
    expect(out[0]?.category).toBe('productivity');
    expect(out[0]?.difficulty).toBe('medium');
  });

  it('throws on malformed text', () => {
    expect(() => parseGeminiSuggestions(geminiResponse('not json at all'))).toThrow();
  });

  it('throws when the response shape is missing content', () => {
    expect(() => parseGeminiSuggestions({ foo: 'bar' })).toThrow();
  });

  it('throws when items have no usable titles', () => {
    const text = JSON.stringify([{ category: 'mind', difficulty: 'easy' }]);
    expect(() => parseGeminiSuggestions(geminiResponse(text))).toThrow();
  });
});

describe('GeminiAdapter via generateQuests', () => {
  it('produces real quests when a key + valid response are present', async () => {
    const text = JSON.stringify([{ title: 'Stretch', category: 'fitness', difficulty: 'easy' }]);
    const adapter = new GeminiAdapter({
      getApiKey: async () => 'user-key',
      http: httpReturning(geminiResponse(text)),
    });
    const result = await generateQuests(adapter, { goal: 'be active' });
    expect(result.source).toBe('ai');
    expect(result.quests[0]?.title).toBe('Stretch');
  });

  it('falls back to FALLBACK_QUESTS without a key', async () => {
    const adapter = new GeminiAdapter({ getApiKey: async () => null });
    const result = await generateQuests(adapter, { goal: 'be active' });
    expect(result.source).toBe('fallback');
  });

  it('falls back when the response is malformed', async () => {
    const adapter = new GeminiAdapter({
      getApiKey: async () => 'user-key',
      http: httpReturning(geminiResponse('garbage')),
    });
    const result = await generateQuests(adapter, { goal: 'be active' });
    expect(result.source).toBe('fallback');
  });

  it('falls back on a non-OK HTTP status', async () => {
    const adapter = new GeminiAdapter({
      getApiKey: async () => 'user-key',
      http: httpReturning({}, false, 429),
    });
    const result = await generateQuests(adapter, { goal: 'be active' });
    expect(result.source).toBe('fallback');
  });
});
