import { clearPlanDays, clearedPlanDayKeys, inScope, questIdsForScope, stripRecurrence } from './dataReset';
import type { PlanDays } from '@/services/plan';
import type { Quest } from '@/types';

function quest(p: Partial<Quest>): Quest {
  return {
    id: p.id ?? 'q',
    title: p.title ?? 'Habit',
    category: p.category ?? 'fitness',
    difficulty: 'easy',
    baseXp: 10,
    completed: false,
    scheduledDays: p.scheduledDays,
    ...p,
  } as Quest;
}

// 2026-06-15 Mon(1), -16 Tue(2), -17 Wed(3).
const plans: PlanDays = {
  '2026-06-15': ['a'], // Mon
  '2026-06-16': ['b'], // Tue
  '2026-06-17': ['a', 'c'], // Wed
};

describe('inScope', () => {
  it('treats undefined as every day', () => {
    expect(inScope(3, undefined)).toBe(true);
    expect(inScope(3, [1])).toBe(false);
    expect(inScope(1, [1, 3])).toBe(true);
  });
});

describe('clearPlanDays', () => {
  it('wipes all plans for the ALL scope', () => {
    expect(clearPlanDays(plans, undefined)).toEqual({});
  });
  it('drops only the matching weekdays', () => {
    expect(clearPlanDays(plans, [1])).toEqual({ '2026-06-16': ['b'], '2026-06-17': ['a', 'c'] });
  });
  it('lists the cleared day keys', () => {
    expect(clearedPlanDayKeys(plans, [1, 3]).sort()).toEqual(['2026-06-15', '2026-06-17']);
  });
});

describe('stripRecurrence', () => {
  const quests = [
    quest({ id: 'run', scheduledDays: [1, 3, 5] }),
    quest({ id: 'read', scheduledDays: [2] }),
    quest({ id: 'plain', scheduledDays: undefined }),
  ];

  it('removes only in-scope weekdays and reports changed quests', () => {
    expect(stripRecurrence(quests, [1])).toEqual([{ id: 'run', scheduledDays: [3, 5] }]);
  });
  it('wipes all recurrence for the ALL scope', () => {
    expect(stripRecurrence(quests, undefined)).toEqual([
      { id: 'run', scheduledDays: [] },
      { id: 'read', scheduledDays: [] },
    ]);
  });
  it('skips quests with no recurrence', () => {
    expect(stripRecurrence([quest({ id: 'plain' })], [1])).toEqual([]);
  });
});

describe('questIdsForScope', () => {
  const quests = [
    quest({ id: 'run', scheduledDays: [1] }), // Mon recurrence
    quest({ id: 'read', scheduledDays: [4] }), // Thu recurrence
    quest({ id: 'c' }), // only via Wed plan
  ];

  it('returns every quest for the ALL scope', () => {
    expect(questIdsForScope(quests, plans, undefined)).toEqual(new Set(['run', 'read', 'c']));
  });
  it('matches by recurrence and by plan day weekday', () => {
    // Monday scope: run (recurs Mon) + a (planned Mon).
    expect(questIdsForScope(quests, plans, [1])).toEqual(new Set(['run', 'a']));
    // Wednesday scope: a + c planned Wed (no recurrence match).
    expect(questIdsForScope(quests, plans, [3])).toEqual(new Set(['a', 'c']));
  });
});
