import { capacitiesForCategories, goalColor, goalHabits, goalProgress, goalWeeklyDays, GOAL_COLOR_IDS, type Goal } from './goal';
import { emptyLevels } from './compounding';
import type { Quest } from '@/types';

const goal: Goal = {
  id: 'g1',
  title: 'Get fit & strong',
  emoji: '💪',
  colorId: 'violet',
  categories: ['fitness', 'health'],
  createdAt: 0,
  order: 0,
  kind: 'personal',
};

describe('goal colours', () => {
  it('offers a palette that excludes gold (reserved for reward)', () => {
    expect(GOAL_COLOR_IDS).not.toContain('gold');
    expect(GOAL_COLOR_IDS).toContain('violet');
    expect(GOAL_COLOR_IDS.length).toBeGreaterThan(2);
  });

  it('resolves accent + soft for a goal colour', () => {
    const c = goalColor({ colorId: 'rose' });
    expect(c.accent).toMatch(/^#/);
    expect(c.soft).toMatch(/^#/);
  });
});

const q = (id: string, category: Quest['category'], over: Partial<Quest> = {}): Quest => ({
  id,
  title: id,
  category,
  difficulty: 'medium',
  baseXp: 40,
  completed: false,
  ...over,
});

describe('capacitiesForCategories', () => {
  it('returns the unique capacities the areas build', () => {
    const caps = capacitiesForCategories(['fitness']);
    expect(caps).toContain('endurance');
    expect(new Set(caps).size).toBe(caps.length); // unique
  });
});

describe('goalHabits', () => {
  it('returns only habits in the goal’s life areas', () => {
    const quests = [q('a', 'fitness'), q('b', 'finance'), q('c', 'health')];
    expect(goalHabits(quests, goal).map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('also includes habits explicitly linked into the goal (union)', () => {
    const quests = [q('a', 'fitness'), q('b', 'finance'), q('c', 'health')];
    // 'b' is finance (not a goal area) but is explicitly tagged in.
    expect(goalHabits(quests, goal, new Set(['b'])).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes project activities from a personal goal’s category match (unless tagged in)', () => {
    const quests = [q('a', 'fitness'), q('b', 'health')];
    const projectIds = new Set(['a']); // 'a' belongs to a project
    expect(goalHabits(quests, goal, undefined, projectIds).map((x) => x.id)).toEqual(['b']);
    // explicit tag overrides the exclusion
    expect(goalHabits(quests, goal, new Set(['a']), projectIds).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('a project goal includes ONLY explicitly linked habits (never bare category)', () => {
    const quests = [q('a', 'fitness'), q('b', 'health')];
    const projectGoal = { ...goal, kind: 'project' as const };
    expect(goalHabits(quests, projectGoal, new Set(['b'])).map((x) => x.id)).toEqual(['b']);
    expect(goalHabits(quests, projectGoal).map((x) => x.id)).toEqual([]);
  });
});

describe('goalProgress', () => {
  it('counts done/planned contributing habits and weekly consistency — no scale numbers', () => {
    const quests = [q('a', 'fitness', { completed: true }), q('b', 'health'), q('c', 'finance')];
    const p = goalProgress({ goal, quests, plannedTodayIds: ['a', 'b'], levels: emptyLevels(), weeklyDays: 3 });
    expect(p.contributingCount).toBe(2);
    expect(p.doneTodayInGoal).toBe(1);
    expect(p.plannedTodayInGoal).toBe(2);
    expect(p.weeklyConsistencyPct).toBe(43); // 3/7
    expect(p).not.toHaveProperty('weight');
  });

  it('treats all contributing habits as planned when there is no plan', () => {
    const quests = [q('a', 'fitness'), q('b', 'health')];
    const p = goalProgress({ goal, quests, levels: emptyLevels(), weeklyDays: 0 });
    expect(p.plannedTodayInGoal).toBe(2);
  });
});

describe('goalWeeklyDays', () => {
  it('counts distinct in-window days with a contributing session', () => {
    const day = (key: string) => new Date(`${key}T12:00:00`).getTime();
    const sessions = [
      { category: 'fitness', createdAt: day('2026-06-15') },
      { category: 'fitness', createdAt: day('2026-06-15') }, // same day → counts once
      { category: 'health', createdAt: day('2026-06-14') },
      { category: 'finance', createdAt: day('2026-06-13') }, // outside goal areas
      { category: 'fitness', createdAt: day('2026-05-01') }, // outside window
    ];
    const weekDays = ['2026-06-15', '2026-06-14', '2026-06-13', '2026-06-12'];
    expect(goalWeeklyDays(sessions, goal, weekDays)).toBe(2);
  });

  it('ignores sessions without a category', () => {
    const sessions = [{ createdAt: new Date('2026-06-15T12:00:00').getTime() }];
    expect(goalWeeklyDays(sessions, goal, ['2026-06-15'])).toBe(0);
  });
});
