import {
  effectivePlan,
  gapsFor,
  goalDayProgress,
  goalFocusPool,
  goalMembersOpen,
  goalMembersProgress,
  habitsForCapacity,
  plannedOpen,
  planProgress,
  planProgressOn,
} from './plan';
import type { Goal } from './goal';
import type { Quest } from '@/types';

function quest(p: Partial<Quest>): Quest {
  return {
    id: p.id ?? 'q',
    title: p.title ?? 'Habit',
    category: p.category ?? 'fitness',
    difficulty: p.difficulty ?? 'easy',
    baseXp: p.baseXp ?? 10,
    completed: p.completed ?? false,
    ...(p.scheduledTime !== undefined ? { scheduledTime: p.scheduledTime } : {}),
    ...(p.lastCompletedDate ? { lastCompletedDate: p.lastCompletedDate } : {}),
  };
}

const q1 = quest({ id: 'q1', title: 'Workout', category: 'fitness' });
const q2 = quest({ id: 'q2', title: 'Read', category: 'learning' });
const q3 = quest({ id: 'q3', title: 'Meditate', category: 'mind' });
const all = [q1, q2, q3];

const fitGoal: Pick<Goal, 'categories' | 'kind'> = { categories: ['fitness', 'mind'], kind: 'personal' };

describe('goalFocusPool / goalDayProgress', () => {
  it('restricts the open focus pool to the goal’s categories, keeping order', () => {
    const pool = goalFocusPool(all, ['q2', 'q1', 'q3'], fitGoal);
    expect(pool.map((q) => q.id)).toEqual(['q1', 'q3']); // q2 (learning) excluded
  });

  it('counts done/total only within the goal', () => {
    const done = quest({ id: 'q1', category: 'fitness', completed: true });
    const p = goalDayProgress([done, q2, q3], ['q1', 'q2', 'q3'], fitGoal);
    expect(p).toEqual({ done: 1, total: 2, pct: 50 }); // fitness done, mind open, learning excluded
  });

  it('falls back to all quests when no plan is set', () => {
    expect(goalFocusPool(all, undefined, fitGoal).map((q) => q.id)).toEqual(['q1', 'q3']);
  });
});

describe('goalMembersOpen / goalMembersProgress', () => {
  it('shows ALL the goal’s open activities, ignoring today’s plan (timed first)', () => {
    const morning = quest({ id: 'm', category: 'fitness', scheduledTime: 450 });
    const untimed = quest({ id: 'u', category: 'mind' });
    const other = quest({ id: 'o', category: 'learning' }); // not in goal
    // No plan restriction: both fitness+mind members appear even though unplanned.
    const ids = goalMembersOpen([untimed, other, morning], fitGoal).map((q) => q.id);
    expect(ids).toEqual(['m', 'u']); // timed first, learning excluded
  });

  it('drops completed members from the swipe pool', () => {
    const done = quest({ id: 'm', category: 'fitness', completed: true });
    const open = quest({ id: 'u', category: 'mind' });
    expect(goalMembersOpen([done, open], fitGoal).map((q) => q.id)).toEqual(['u']);
  });

  it('counts progress over all the goal’s members (not just planned)', () => {
    const done = quest({ id: 'm', category: 'fitness', completed: true });
    const open = quest({ id: 'u', category: 'mind' });
    const other = quest({ id: 'o', category: 'learning' });
    expect(goalMembersProgress([done, open, other], fitGoal)).toEqual({ done: 1, total: 2, pct: 50 });
  });
});

describe('effectivePlan', () => {
  it('falls back to all habits when no plan is set', () => {
    expect(effectivePlan(all, undefined)).toEqual(all);
  });

  it('returns planned habits in plan order, ignoring unknown ids', () => {
    expect(effectivePlan(all, ['q3', 'q1', 'ghost']).map((q) => q.id)).toEqual(['q3', 'q1']);
  });

  it('respects an explicit empty plan', () => {
    expect(effectivePlan(all, [])).toEqual([]);
  });
});

describe('plannedOpen', () => {
  it('keeps open habits, timed first (ascending) then plan order', () => {
    const morning = quest({ id: 'a', scheduledTime: 450 }); // 7:30
    const noon = quest({ id: 'b', scheduledTime: 720 }); // 12:00
    const untimed1 = quest({ id: 'c' });
    const untimed2 = quest({ id: 'd' });
    const done = quest({ id: 'e', completed: true, scheduledTime: 60 });
    const quests = [untimed1, noon, done, untimed2, morning];
    const order = plannedOpen(quests, ['c', 'b', 'e', 'd', 'a']).map((q) => q.id);
    expect(order).toEqual(['a', 'b', 'c', 'd']); // timed asc, then untimed in plan order; done dropped
  });
});

describe('planProgress', () => {
  it('measures completion across the planned set only', () => {
    const quests = [quest({ id: 'q1', completed: true }), quest({ id: 'q2' }), quest({ id: 'q3', completed: true })];
    expect(planProgress(quests, ['q1', 'q2'])).toEqual({ done: 1, total: 2, pct: 50 });
  });
});

describe('planProgressOn', () => {
  it('counts planned ids present in the day’s done set', () => {
    expect(planProgressOn(['q1', 'q2', 'q3'], new Set(['q1', 'q3']))).toEqual({ done: 2, total: 3, pct: 67 });
    expect(planProgressOn([], new Set())).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe('gapsFor', () => {
  it('returns planned habits not completed that day', () => {
    const gaps = gapsFor(all, ['q1', 'q2', 'q3'], new Set(['q2']));
    expect(gaps.map((q) => q.id)).toEqual(['q1', 'q3']);
  });
});

describe('habitsForCapacity', () => {
  it('returns habits that feed a capacity, strongest first', () => {
    // fitness → endurance Strong(8); learning has no endurance link.
    const ids = habitsForCapacity(all, 'endurance').map((q) => q.id);
    expect(ids).toContain('q1');
    expect(ids).not.toContain('q2');
  });

  it('orders by delta strength for the capacity', () => {
    // energy: fitness=Medium(4), learning=Light(2), mind has no energy link.
    const ids = habitsForCapacity(all, 'energy').map((q) => q.id);
    expect(ids).toEqual(['q1', 'q2']);
  });
});
