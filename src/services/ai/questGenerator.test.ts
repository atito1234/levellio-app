import { generateQuests, suggestedToQuest, FALLBACK_QUESTS } from './questGenerator';
import { AIUnavailableError } from './errors';
import type { AIEngine, SuggestedQuest } from './AIEngine';

function fakeEngine(suggest: AIEngine['suggestQuests']): AIEngine {
  return {
    id: 'on-device',
    label: 'fake',
    isPrivate: true,
    suggestQuests: suggest,
    motivate: async () => '',
  };
}

const AI_RESULT: SuggestedQuest[] = [
  { title: 'Meditate 5 minutes', category: 'mind', difficulty: 'easy' },
  { title: 'Run 2km', category: 'fitness', difficulty: 'medium' },
];

describe('generateQuests resilience', () => {
  it('returns AI suggestions on success', async () => {
    const engine = fakeEngine(async () => AI_RESULT);
    const result = await generateQuests(engine, { goal: 'get fit' });
    expect(result.source).toBe('ai');
    expect(result.quests).toEqual(AI_RESULT);
  });

  it('falls back when the engine returns an empty list', async () => {
    const engine = fakeEngine(async () => []);
    const result = await generateQuests(engine, { goal: 'get fit' });
    expect(result.source).toBe('fallback');
    expect(result.quests.length).toBeGreaterThan(0);
  });

  it('falls back on a generic error', async () => {
    const engine = fakeEngine(async () => {
      throw new Error('boom');
    });
    const result = await generateQuests(engine, { goal: 'get fit' });
    expect(result.source).toBe('fallback');
  });

  it('falls back when offline / unavailable', async () => {
    const engine = fakeEngine(async () => {
      throw new AIUnavailableError();
    });
    const result = await generateQuests(engine, { goal: 'get fit' });
    expect(result.source).toBe('fallback');
    expect(result.quests).toEqual([...FALLBACK_QUESTS]);
  });

  it('falls back on timeout', async () => {
    const engine = fakeEngine(() => new Promise<SuggestedQuest[]>(() => {}));
    const result = await generateQuests(engine, { goal: 'get fit' }, { timeoutMs: 20 });
    expect(result.source).toBe('fallback');
  });

  it('trims AI suggestions to the requested count', async () => {
    const engine = fakeEngine(async () => AI_RESULT);
    const result = await generateQuests(engine, { goal: 'get fit' }, { count: 1 });
    expect(result.quests).toHaveLength(1);
  });

  it('filters fallback quests by requested category', async () => {
    const engine = fakeEngine(async () => {
      throw new AIUnavailableError();
    });
    const result = await generateQuests(engine, { goal: 'lift', category: 'fitness' });
    expect(result.quests.every((q) => q.category === 'fitness')).toBe(true);
  });
});

describe('suggestedToQuest', () => {
  it('maps base XP from difficulty', () => {
    expect(suggestedToQuest({ title: 'X', category: 'productivity', difficulty: 'hard' }, 'id1')).toEqual({
      id: 'id1',
      title: 'X',
      category: 'productivity',
      difficulty: 'hard',
      baseXp: 70,
      completed: false,
      canonicalKey: 'x',
    });
  });
});
