import { buildCoaching, type CoachingContext } from './coaching';
import type { Goal } from './goal';

const base: CoachingContext = {
  dragonId: 'procrastination',
  goals: [],
  seed: 0,
};

const ctx = (over: Partial<CoachingContext> = {}): CoachingContext => ({ ...base, ...over });

const goal = (title: string, categories: Goal['categories']): Goal => ({
  id: title,
  title,
  emoji: '🎯',
  colorId: 'violet',
  categories,
  createdAt: 0,
  order: 0,
  kind: 'personal',
});

describe('buildCoaching', () => {
  it('infers a blocker from the dragon + recent mood', () => {
    // In 'fear', the first blocker whose moods include 'drained' is "overwhelm".
    expect(buildCoaching(ctx({ dragonId: 'fear', recentMood: 'drained' })).blocker.id).toBe('overwhelm');
  });

  it('honors an explicit blockerId over inference', () => {
    expect(buildCoaching(ctx({ blockerId: 'distraction' })).blocker.id).toBe('distraction');
  });

  it('falls back to a universal cluster for a dragon with no curated blockers', () => {
    const plan = buildCoaching(ctx({ dragonId: 'custom' }));
    expect(plan.blocker).toBeDefined();
    expect(plan.questions.length).toBeGreaterThan(0);
  });

  it('recommends a tactic that fits the time available', () => {
    const plan = buildCoaching(ctx({ minutesAvailable: 2 }));
    expect(plan.tactic.timeCostMin).toBeLessThanOrEqual(2);
  });

  it('prefers a tactic matched to the habit category', () => {
    const plan = buildCoaching(
      ctx({ blockerId: 'distraction', minutesAvailable: 60, quest: { title: 'Study Spanish', category: 'learning' } }),
    );
    expect(plan.tactic.id).toBe('pomodoro'); // pomodoro is tagged for learning
  });

  it('returns 3–5 deduped questions, deterministically for a fixed seed', () => {
    const a = buildCoaching(ctx());
    const b = buildCoaching(ctx());
    expect(a.questions.length).toBeGreaterThanOrEqual(3);
    expect(a.questions.length).toBeLessThanOrEqual(5);
    expect(new Set(a.questions.map((q) => q.id)).size).toBe(a.questions.length);
    expect(a).toEqual(b);
  });

  it('rotates the lead question with the seed (still deterministic)', () => {
    const lead0 = buildCoaching(ctx({ seed: 0 })).questions[0]!.id;
    const lead1 = buildCoaching(ctx({ seed: 1 })).questions[0]!.id;
    expect(lead0).not.toBe(lead1);
  });

  it('attaches honest evidence (principle + source) for the tactic', () => {
    const plan = buildCoaching(ctx());
    expect(plan.evidence.principle.length).toBeGreaterThan(0);
    expect(plan.evidence.source.length).toBeGreaterThan(0);
  });

  it('weaves in habit + goal context when a quest is present', () => {
    const plan = buildCoaching(
      ctx({ quest: { title: 'Meditate', category: 'mind' }, goals: [goal('Lower my stress', ['mind'])] }),
    );
    expect(plan.context?.goalTitle).toBe('Lower my stress');
  });

  it('omits context when there is no quest', () => {
    expect(buildCoaching(ctx()).context).toBeUndefined();
  });
});
