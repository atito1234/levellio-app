import { generateCoaching } from './coachGenerator';
import { buildCoaching, type CoachingContext } from '@/lib/coaching';
import type { AIEngine, CoachSuggestion } from './AIEngine';

const ctx: CoachingContext = { dragonId: 'procrastination', goals: [] };

const baseEngine: AIEngine = {
  id: 'on-device',
  label: 'Test',
  isPrivate: true,
  suggestQuests: async () => [],
  motivate: async () => '',
};

const withCoach = (coach: AIEngine['coach']): AIEngine => ({ ...baseEngine, coach });

describe('generateCoaching', () => {
  it('returns curated on the free tier even if the engine can coach', async () => {
    const engine = withCoach(async () => ({ questions: ['ai?'], tactic: { name: 'AI', how: 'do' } }));
    const r = await generateCoaching(engine, ctx, false);
    expect(r.source).toBe('curated');
  });

  it('returns curated when the engine has no coach capability', async () => {
    const r = await generateCoaching(baseEngine, ctx, true);
    expect(r.source).toBe('curated');
  });

  it('merges AI text but keeps the curated evidence on success', async () => {
    const ai: CoachSuggestion = { questions: ['What is one tiny step?'], tactic: { name: 'AI Tactic', how: 'Begin now.' } };
    const r = await generateCoaching(withCoach(async () => ai), ctx, true);
    expect(r.source).toBe('ai');
    expect(r.plan.tactic.name).toBe('AI Tactic');
    expect(r.plan.questions[0]!.text).toBe('What is one tiny step?');
    // Evidence is the honest curated principle/source, never AI-fabricated.
    expect(r.plan.evidence).toEqual(buildCoaching(ctx).evidence);
  });

  it('falls back to curated when the AI result is empty', async () => {
    const r = await generateCoaching(withCoach(async () => ({ questions: [], tactic: { name: '', how: '' } })), ctx, true);
    expect(r.source).toBe('curated');
  });

  it('falls back to curated when the engine throws', async () => {
    const r = await generateCoaching(withCoach(async () => { throw new Error('boom'); }), ctx, true);
    expect(r.source).toBe('curated');
  });

  it('falls back to curated on timeout', async () => {
    const slow = withCoach(() => new Promise<CoachSuggestion>(() => {})); // never resolves
    const r = await generateCoaching(slow, ctx, true, { timeoutMs: 20 });
    expect(r.source).toBe('curated');
  });
});
