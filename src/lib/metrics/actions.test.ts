import { nextWeekdayKey, runInsightAction, type ActionNavigator } from './actions';
import type { InsightAction } from './types';

// 2026-06-16 is a Tuesday.
describe('nextWeekdayKey', () => {
  it('returns the same day when it already matches', () => {
    expect(nextWeekdayKey(2, '2026-06-16')).toBe('2026-06-16'); // Tue
  });
  it('finds the next occurrence forward', () => {
    expect(nextWeekdayKey(5, '2026-06-16')).toBe('2026-06-19'); // next Fri
    expect(nextWeekdayKey(1, '2026-06-16')).toBe('2026-06-22'); // next Mon (wraps)
  });
});

describe('runInsightAction', () => {
  const today = '2026-06-16';
  function run(a: InsightAction) {
    const navigate = jest.fn();
    runInsightAction({ navigate } as ActionNavigator, a, today);
    return navigate;
  }

  it('plan → Plan with the day', () => {
    expect(run({ label: '', kind: 'plan', target: { dayKey: '2026-06-17' } }).mock.calls[0]).toEqual([
      'Plan',
      { day: '2026-06-17' },
    ]);
  });

  it('do → Ripple with the quest', () => {
    expect(run({ label: '', kind: 'do', target: { questId: 'q1' } }).mock.calls[0]).toEqual(['Ripple', { questId: 'q1' }]);
  });

  it('edit → QuestEditor', () => {
    expect(run({ label: '', kind: 'edit', target: { questId: 'q1' } }).mock.calls[0]).toEqual([
      'QuestEditor',
      { questId: 'q1' },
    ]);
  });

  it('schedule with a weekday → Plan on the next occurrence', () => {
    expect(run({ label: '', kind: 'schedule', target: { weekday: 5 } }).mock.calls[0]).toEqual([
      'Plan',
      { day: '2026-06-19' },
    ]);
  });

  it('focus routes by target type', () => {
    expect(run({ label: '', kind: 'focus', target: { goalId: 'g1' } }).mock.calls[0]).toEqual(['GoalFocus', { goalId: 'g1' }]);
    expect(run({ label: '', kind: 'focus', target: { capacityId: 'calm' } }).mock.calls[0]).toEqual([
      'CapacityFocus',
      { capacityId: 'calm' },
    ]);
    expect(run({ label: '', kind: 'focus', target: { questId: 'q1' } }).mock.calls[0]).toEqual([
      'ActivityJourney',
      { activityId: 'q1' },
    ]);
  });

  it('does nothing when a required target is missing', () => {
    expect(run({ label: '', kind: 'do', target: {} }).mock.calls).toHaveLength(0);
  });
});
