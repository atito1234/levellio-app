import { materializeInto, recurringIdsForDay, recursOn, weekdayOfKey, weekdaysLabel } from './recurrence';
import type { Quest } from '@/types';

const q = (id: string, scheduledDays?: number[]): Quest => ({
  id,
  title: id,
  category: 'fitness',
  difficulty: 'easy',
  baseXp: 10,
  completed: false,
  ...(scheduledDays ? { scheduledDays } : {}),
});

describe('weekdayOfKey', () => {
  it('returns the local weekday (0=Sun..6=Sat)', () => {
    expect(weekdayOfKey('2026-06-14')).toBe(0); // Sunday
    expect(weekdayOfKey('2026-06-15')).toBe(1); // Monday
    expect(weekdayOfKey('2026-06-16')).toBe(2); // Tuesday
    expect(weekdayOfKey('2026-06-20')).toBe(6); // Saturday
  });
});

describe('recurringIdsForDay / recursOn', () => {
  const quests = [q('mwf', [1, 3, 5]), q('weekend', [0, 6]), q('none')];

  it('matches only habits whose scheduledDays include the weekday', () => {
    expect(recurringIdsForDay(quests, 1)).toEqual(['mwf']); // Monday
    expect(recurringIdsForDay(quests, 0)).toEqual(['weekend']); // Sunday
    expect(recurringIdsForDay(quests, 2)).toEqual([]); // Tuesday
  });

  it('recursOn resolves the weekday from a day key', () => {
    expect(recursOn(q('x', [1, 3, 5]), '2026-06-15')).toBe(true); // Monday
    expect(recursOn(q('x', [1, 3, 5]), '2026-06-16')).toBe(false); // Tuesday
    expect(recursOn(q('x'), '2026-06-15')).toBe(false);
  });
});

describe('materializeInto', () => {
  it('merges recurring ids into a day and marks it', () => {
    const res = materializeInto({}, [], [{ dayKey: '2026-06-15', ids: ['a', 'b'] }]);
    expect(res).toEqual({ days: { '2026-06-15': ['a', 'b'] }, materialized: ['2026-06-15'] });
  });

  it('skips days with no recurring ids (preserves the no-plan fallback)', () => {
    expect(materializeInto({}, [], [{ dayKey: '2026-06-16', ids: [] }])).toBeNull();
  });

  it('does not re-add to an already-materialized day (user removals stick)', () => {
    // Day was materialized then the user removed 'a' (plan now empty).
    const res = materializeInto({ '2026-06-15': [] }, ['2026-06-15'], [{ dayKey: '2026-06-15', ids: ['a'] }]);
    expect(res).toBeNull();
  });

  it('unions with existing plan ids without duplicating', () => {
    const res = materializeInto({ '2026-06-15': ['a'] }, [], [{ dayKey: '2026-06-15', ids: ['a', 'b'] }]);
    expect(res?.days['2026-06-15']).toEqual(['a', 'b']);
  });
});

describe('weekdaysLabel', () => {
  it('formats special and arbitrary patterns', () => {
    expect(weekdaysLabel([])).toBe('');
    expect(weekdaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(weekdaysLabel([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(weekdaysLabel([0, 6])).toBe('Weekends');
    expect(weekdaysLabel([1, 3, 5])).toBe('Mon · Wed · Fri');
  });
});
