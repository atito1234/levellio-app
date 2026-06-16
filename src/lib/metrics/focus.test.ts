import { focusRecommendations } from './focus';
import { emptyLevels, type CapacityLevels } from '../compounding';
import type { GroupStat } from './types';
import type { Quest } from '@/types';

function quest(p: Partial<Quest>): Quest {
  return {
    id: p.id ?? 'q',
    title: p.title ?? 'Habit',
    category: p.category ?? 'fitness',
    difficulty: 'easy',
    baseXp: 10,
    completed: false,
    ...p,
  } as Quest;
}

function stat(p: Partial<GroupStat>): GroupStat {
  return {
    id: p.id ?? 'g',
    kind: p.kind ?? 'habit',
    label: p.label ?? 'G',
    scheduled: p.scheduled ?? 0,
    done: p.done ?? 0,
    adherencePct: p.adherencePct ?? 0,
    deltaPct: p.deltaPct ?? 0,
    streak: p.streak ?? 0,
    weekly: p.weekly ?? [],
    gapWeekdays: p.gapWeekdays ?? [],
  };
}

const healthyLevels: CapacityLevels = { ...emptyLevels(), energy: 80, sleep: 80, endurance: 80, calm: 80, focus: 80, hydration: 80 };

describe('focusRecommendations', () => {
  it('flags the lagging capacity with a "do" CTA for its best feeding habit', () => {
    const levels: CapacityLevels = { ...healthyLevels, calm: 10 };
    const meditate = quest({ id: 'med', title: 'Meditate', category: 'mind' }); // mind → calm Strong
    const recs = focusRecommendations({ stats: [], levels, quests: [meditate], todayKey: '2026-06-16' });
    const cap = recs.find((r) => r.id === 'cap:calm');
    expect(cap).toBeDefined();
    expect(cap!.action.kind).toBe('do');
    expect(cap!.action.target.questId).toBe('med');
  });

  it('flags the worst-adhering goal with a "focus" CTA', () => {
    const recs = focusRecommendations({
      stats: [
        stat({ id: 'goalA', kind: 'goal', label: 'Fitness', scheduled: 5, done: 1, adherencePct: 20 }),
        stat({ id: 'goalB', kind: 'goal', label: 'Mind', scheduled: 5, done: 4, adherencePct: 80 }),
      ],
      levels: healthyLevels,
      quests: [],
      todayKey: '2026-06-16',
    });
    const grp = recs.find((r) => r.id === 'grp:goalA');
    expect(grp).toBeDefined();
    expect(grp!.action.kind).toBe('focus');
    expect(grp!.action.target.goalId).toBe('goalA');
  });

  it('flags the most-missed weekday with a "schedule" CTA', () => {
    const recs = focusRecommendations({
      stats: [
        stat({ kind: 'habit', id: 'h1', gapWeekdays: [3] }),
        stat({ kind: 'habit', id: 'h2', gapWeekdays: [3, 1] }),
      ],
      levels: healthyLevels,
      quests: [],
      todayKey: '2026-06-16',
    });
    const wd = recs.find((r) => r.id === 'wd:3');
    expect(wd).toBeDefined();
    expect(wd!.action.kind).toBe('schedule');
    expect(wd!.action.target.weekday).toBe(3);
  });

  it('returns nothing actionable when everything is healthy', () => {
    const recs = focusRecommendations({
      stats: [stat({ kind: 'goal', adherencePct: 90, scheduled: 5, done: 5 })],
      levels: healthyLevels,
      quests: [],
      todayKey: '2026-06-16',
    });
    expect(recs).toEqual([]);
  });

  it('orders by severity (most urgent first) and respects the limit', () => {
    const levels: CapacityLevels = { ...healthyLevels, calm: 5 };
    const recs = focusRecommendations({
      stats: [stat({ id: 'goalA', kind: 'goal', label: 'Fitness', scheduled: 5, done: 0, adherencePct: 0 })],
      levels,
      quests: [quest({ id: 'med', category: 'mind' })],
      todayKey: '2026-06-16',
      limit: 1,
    });
    expect(recs).toHaveLength(1);
    expect(recs[0]!.id).toBe('cap:calm'); // capacity severity (~0.97) > goal (~0.8)
  });
});
