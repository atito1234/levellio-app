import { dayProgress, groupHabitsIntoRails, pickFocusHabit } from './dashboard';
import type { HabitBucket } from '@/lib/buckets';
import type { Quest } from '@/types';

function q(id: string, category: Quest['category'], completed = false): Quest {
  return { id, title: id, category, difficulty: 'easy', baseXp: 20, completed };
}

const bucket = (id: string, name: string, order: number): HabitBucket => ({
  id,
  name,
  iconId: 'heart',
  colorId: 'teal',
  createdAt: 0,
  order,
});

describe('pickFocusHabit', () => {
  it('returns the first incomplete habit', () => {
    const quests = [q('a', 'health', true), q('b', 'fitness'), q('c', 'mind')];
    expect(pickFocusHabit(quests)?.id).toBe('b');
  });

  it('returns null when all are complete or empty', () => {
    expect(pickFocusHabit([q('a', 'health', true)])).toBeNull();
    expect(pickFocusHabit([])).toBeNull();
  });
});

describe('dayProgress', () => {
  it('computes real completion percentage', () => {
    expect(dayProgress([q('a', 'health', true), q('b', 'fitness'), q('c', 'mind', true)])).toEqual({
      done: 2,
      total: 3,
      pct: 67,
    });
  });

  it('is 0% with no habits (never fabricated)', () => {
    expect(dayProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('reaches 100 only when everything is done', () => {
    expect(dayProgress([q('a', 'health', true)]).pct).toBe(100);
  });
});

describe('groupHabitsIntoRails', () => {
  const quests = [q('a', 'fitness'), q('b', 'health', true), q('c', 'mind'), q('d', 'fitness', true)];

  it('groups by category when there are no buckets, non-empty rails only, open first', () => {
    const rails = groupHabitsIntoRails(quests, [], {});
    expect(rails.map((r) => r.id)).toEqual(['fitness', 'mind', 'health']);
    const fitness = rails.find((r) => r.id === 'fitness')!;
    // open ('a') leads completed ('d')
    expect(fitness.habits.map((h) => h.id)).toEqual(['a', 'd']);
    expect(fitness.source).toBe('category');
  });

  it('groups by real buckets when present, with an Unfiled rail for the rest', () => {
    const buckets = [bucket('B1', 'Health', 0), bucket('B2', 'Body', 1)];
    const assignments = { a: 'B2', b: 'B1' }; // c, d unfiled
    const rails = groupHabitsIntoRails(quests, buckets, assignments);
    expect(rails.map((r) => r.label)).toEqual(['Health', 'Body', 'Unfiled']);
    expect(rails.find((r) => r.id === 'unfiled')!.habits.map((h) => h.id).sort()).toEqual(['c', 'd']);
    expect(rails.find((r) => r.id === 'B1')!.source).toBe('bucket');
  });

  it('treats assignments to deleted buckets as unfiled', () => {
    const rails = groupHabitsIntoRails([q('a', 'fitness')], [bucket('B1', 'Health', 0)], { a: 'ghost' });
    expect(rails.map((r) => r.id)).toEqual(['unfiled']);
  });
});
