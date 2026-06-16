import {
  computeStat,
  doneDaysByActivity,
  habitStat,
  previousRange,
  rangeKeys,
  weeklyAdherencePoints,
} from './adherence';
import type { ActivitySessionEvent } from '../metadata';
import type { Quest } from '@/types';

// Week of interest: 2026-06-14 Sun … 2026-06-20 Sat.
function session(activityId: string, y: number, m: number, d: number): ActivitySessionEvent {
  return {
    id: `e-${activityId}-${d}`,
    type: 'activity_session',
    createdAt: new Date(y, m - 1, d, 12, 0).getTime(),
    appVersion: '1.0.0',
    activityId,
    title: activityId,
    category: 'fitness',
    method: 'manual',
    durationSec: 0,
  };
}

function quest(p: Partial<Quest>): Quest {
  return {
    id: p.id ?? 'q1',
    title: p.title ?? 'Run',
    category: p.category ?? 'fitness',
    difficulty: 'easy',
    baseXp: 10,
    completed: false,
    scheduledDays: p.scheduledDays,
    ...p,
  } as Quest;
}

const WEEK = { start: '2026-06-14', end: '2026-06-20' };
const noPlan = () => undefined;

describe('rangeKeys / previousRange', () => {
  it('lists inclusive day keys oldest→newest', () => {
    expect(rangeKeys(WEEK)).toEqual([
      '2026-06-14',
      '2026-06-15',
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
    ]);
  });

  it('returns the equal-length window immediately before', () => {
    expect(previousRange(WEEK)).toEqual({ start: '2026-06-07', end: '2026-06-13' });
  });

  it('returns [] for an inverted range', () => {
    expect(rangeKeys({ start: '2026-06-20', end: '2026-06-14' })).toEqual([]);
  });
});

describe('habitStat — recurrence-scheduled', () => {
  // Mon/Wed/Fri habit; done Mon (15) + Wed (17), missed Fri (19).
  const q = quest({ id: 'q1', scheduledDays: [1, 3, 5] });
  const sessions = [session('q1', 2026, 6, 15), session('q1', 2026, 6, 17)];

  it('computes scheduled, done, and adherence', () => {
    const s = habitStat(q, sessions, noPlan, WEEK);
    expect(s.scheduled).toBe(3);
    expect(s.done).toBe(2);
    expect(s.adherencePct).toBe(67);
  });

  it('flags the missed weekday (Fri=5) as the gap', () => {
    expect(habitStat(q, sessions, noPlan, WEEK).gapWeekdays).toEqual([5]);
  });

  it('breaks the streak on the latest missed scheduled day', () => {
    // Sat has no occurrence (skip), Fri missed → streak 0.
    expect(habitStat(q, sessions, noPlan, WEEK).streak).toBe(0);
  });

  it('computes a positive delta vs an empty previous week', () => {
    const s = habitStat(q, sessions, noPlan, WEEK);
    expect(s.deltaPct).toBe(67); // 67% this week vs 0% (all missed) last week
  });
});

describe('streak counts trailing completed scheduled days', () => {
  it('counts consecutive done occurrences from the end', () => {
    const q = quest({ id: 'q1', scheduledDays: [1, 3, 5] });
    const sessions = [session('q1', 2026, 6, 15), session('q1', 2026, 6, 17), session('q1', 2026, 6, 19)];
    expect(habitStat(q, sessions, noPlan, WEEK).streak).toBe(3);
  });
});

describe('habitStat — plan-membership scheduled (non-recurring)', () => {
  it('treats explicit plan membership as the schedule', () => {
    const q = quest({ id: 'q2', scheduledDays: undefined });
    const getPlan = (day: string) => (day === '2026-06-16' ? ['q2'] : undefined);
    const sessions = [session('q2', 2026, 6, 16)];
    const s = habitStat(q, sessions, getPlan, WEEK);
    expect(s.scheduled).toBe(1);
    expect(s.done).toBe(1);
    expect(s.adherencePct).toBe(100);
  });
});

describe('computeStat — group aggregate', () => {
  it('sums occurrences across members', () => {
    const a = quest({ id: 'a', scheduledDays: [1, 3, 5] }); // 3 scheduled, 2 done
    const b = quest({ id: 'b', scheduledDays: [1] }); // 1 scheduled (Mon 15), 0 done
    const sessions = [session('a', 2026, 6, 15), session('a', 2026, 6, 17)];
    const stat = computeStat({
      id: 'goal1',
      kind: 'goal',
      label: 'Get fit',
      members: [a, b],
      sessions,
      getPlan: noPlan,
      range: WEEK,
    });
    expect(stat.scheduled).toBe(4);
    expect(stat.done).toBe(2);
    expect(stat.adherencePct).toBe(50);
  });
});

describe('doneDaysByActivity', () => {
  it('groups sessions into day sets per activity', () => {
    const map = doneDaysByActivity([session('a', 2026, 6, 15), session('a', 2026, 6, 15), session('b', 2026, 6, 16)]);
    expect(map.get('a')).toEqual(new Set(['2026-06-15']));
    expect(map.get('b')).toEqual(new Set(['2026-06-16']));
  });
});

describe('weeklyAdherencePoints', () => {
  it('emits one dated point per non-empty week', () => {
    const q = quest({ id: 'q1', scheduledDays: [1, 3, 5] });
    const sessions = [session('q1', 2026, 6, 15), session('q1', 2026, 6, 17)];
    const pts = weeklyAdherencePoints({
      id: 'q1',
      kind: 'habit',
      label: 'Run',
      members: [q],
      sessions,
      getPlan: noPlan,
      range: WEEK,
    });
    expect(pts).toEqual([{ dayKey: '2026-06-14', value: 67 }]);
  });
});
