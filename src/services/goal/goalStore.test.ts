import { GoalStore, normalizeGoals, MAX_GOALS } from './goalStore';
import { InMemoryStore } from '@/services/storage/InMemoryStore';
import type { Goal } from '@/lib/goal';

const goal = (id: string, over: Partial<Goal> = {}): Goal => ({
  id,
  title: `Goal ${id}`,
  emoji: '🎯',
  colorId: 'violet',
  categories: ['fitness'],
  createdAt: 0,
  order: 0,
  kind: 'personal',
  ...over,
});

describe('normalizeGoals', () => {
  it('drops malformed goals and bad categories, renumbers order', () => {
    const goals = normalizeGoals({
      goals: [
        { id: 'a', title: 'Keep', emoji: '💪', colorId: 'teal', categories: ['fitness', 'bogus'], order: 5 },
        { id: 'b', title: '', categories: [] }, // empty title → dropped
        null,
        { title: 'no id' }, // no id → dropped
      ],
    });
    expect(goals).toHaveLength(1);
    expect(goals[0]!.categories).toEqual(['fitness']);
    expect(goals[0]!.order).toBe(0);
    expect(goals[0]!.colorId).toBe('teal');
  });

  it('returns [] for malformed input', () => {
    expect(normalizeGoals(null)).toEqual([]);
    expect(normalizeGoals({ goals: 7 })).toEqual([]);
  });

  it('migrates legacy goals to kind:personal, and keeps project kind + projectId', () => {
    const goals = normalizeGoals({
      goals: [
        { id: 'a', title: 'Legacy', categories: ['fitness'] }, // v1 → personal
        { id: 'b', title: 'Proj', categories: ['health'], kind: 'project', projectId: 'proj-x', supportingGoalIds: ['a'] },
        { id: 'c', title: 'NoPid', categories: [], kind: 'project' }, // project without projectId
      ],
    });
    expect(goals.find((g) => g.id === 'a')!.kind).toBe('personal');
    const proj = goals.find((g) => g.id === 'b')!;
    expect(proj.kind).toBe('project');
    expect(proj.projectId).toBe('proj-x');
    expect(proj.supportingGoalIds).toEqual(['a']);
    expect(goals.find((g) => g.id === 'c')!.projectId).toBeUndefined();
  });

  it('accepts palette colours, falls back for gold/unknown, keeps legacy violet/teal', () => {
    const goals = normalizeGoals({
      goals: [
        { id: 'a', title: 'Rose', categories: ['fitness'], colorId: 'rose' },
        { id: 'b', title: 'Gold', categories: ['fitness'], colorId: 'gold' }, // reserved → fallback
        { id: 'c', title: 'Bad', categories: ['fitness'], colorId: 'mauve' }, // unknown → fallback
        { id: 'd', title: 'Teal', categories: ['fitness'], colorId: 'teal' },
      ],
    });
    expect(goals.map((g) => g.colorId)).toEqual(['rose', 'violet', 'violet', 'teal']);
  });
});

describe('GoalStore', () => {
  it('round-trips goals', async () => {
    const store = new GoalStore(new InMemoryStore());
    await store.save('u1', [goal('a'), goal('b', { colorId: 'teal' })]);
    const out = await store.load('u1');
    expect(out.map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('bounds the number of stored goals', async () => {
    const store = new GoalStore(new InMemoryStore());
    const many = Array.from({ length: MAX_GOALS + 5 }, (_, i) => goal(`g${i}`, { order: i }));
    await store.save('u1', many);
    expect(await store.load('u1')).toHaveLength(MAX_GOALS);
  });
});
