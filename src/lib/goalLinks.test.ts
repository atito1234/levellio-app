import {
  EMPTY_GOAL_LINKS,
  goalsForHabit,
  habitsForGoal,
  isInGoal,
  linkGoal,
  normalizeGoalLinks,
  unlinkGoal,
  unlinkGoalEverywhere,
} from './goalLinks';

describe('goalLinks', () => {
  it('links a habit into multiple goals (idempotent)', () => {
    let l = EMPTY_GOAL_LINKS;
    l = linkGoal(l, 'q1', 'gHealth');
    l = linkGoal(l, 'q1', 'gCommunity');
    l = linkGoal(l, 'q1', 'gHealth'); // dup ignored
    expect(goalsForHabit(l, 'q1').sort()).toEqual(['gCommunity', 'gHealth']);
    expect(isInGoal(l, 'q1', 'gCommunity')).toBe(true);
  });

  it('unlinks and drops empty keys', () => {
    let l = linkGoal(EMPTY_GOAL_LINKS, 'q1', 'gA');
    l = unlinkGoal(l, 'q1', 'gA');
    expect(goalsForHabit(l, 'q1')).toEqual([]);
    expect(Object.keys(l)).toEqual([]);
  });

  it('habitsForGoal lists members', () => {
    let l = linkGoal(EMPTY_GOAL_LINKS, 'q1', 'gA');
    l = linkGoal(l, 'q2', 'gA');
    l = linkGoal(l, 'q3', 'gB');
    expect(habitsForGoal(l, 'gA').sort()).toEqual(['q1', 'q2']);
  });

  it('unlinkGoalEverywhere removes a deleted goal', () => {
    let l = linkGoal(EMPTY_GOAL_LINKS, 'q1', 'gA');
    l = linkGoal(l, 'q1', 'gB');
    l = linkGoal(l, 'q2', 'gA');
    l = unlinkGoalEverywhere(l, 'gA');
    expect(goalsForHabit(l, 'q1')).toEqual(['gB']);
    expect(goalsForHabit(l, 'q2')).toEqual([]);
  });

  it('normalizes persisted blobs and junk', () => {
    expect(normalizeGoalLinks(null)).toEqual({});
    expect(normalizeGoalLinks({ links: { q1: ['gA', 'gA', 'gB'], q2: 'nope', q3: [] } })).toEqual({
      q1: ['gA', 'gB'],
    });
  });
});
