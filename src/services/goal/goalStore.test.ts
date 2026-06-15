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
