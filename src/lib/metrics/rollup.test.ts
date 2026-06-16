import { mergeRollups, rollupDays, rollupForDay } from './rollup';
import type { ActivitySessionEvent } from '../metadata';

function session(p: Partial<ActivitySessionEvent> & { d: number }): ActivitySessionEvent {
  return {
    id: p.id ?? `e-${p.d}-${p.category ?? 'x'}`,
    type: 'activity_session',
    createdAt: new Date(2026, 5, p.d, 12, 0).getTime(),
    appVersion: '1.0.0',
    activityId: p.activityId ?? 'q1',
    title: p.title ?? 'Run',
    category: p.category ?? 'fitness',
    method: p.method ?? 'timer',
    durationSec: p.durationSec ?? 0,
    rating: p.rating,
  };
}

describe('rollupForDay', () => {
  it('aggregates minutes, counts, capacity points, and rating for the day', () => {
    const sessions = [
      session({ d: 15, category: 'fitness', durationSec: 600 }), // 10 min
      session({ d: 15, category: 'fitness', durationSec: 1200, rating: 4 }), // 20 min
      session({ d: 15, category: 'mind', durationSec: 300, rating: 2 }), // 5 min
      session({ d: 16, category: 'fitness', durationSec: 600 }), // other day, ignored
    ];
    const r = rollupForDay(sessions, '2026-06-15');
    expect(r.dayKey).toBe('2026-06-15');
    expect(r.sessions).toBe(3);
    expect(r.perCategoryMin).toEqual({ fitness: 30, mind: 5 });
    expect(r.perCategoryDone).toEqual({ fitness: 2, mind: 1 });
    expect(r.ratingAvg).toBe(3); // (4 + 2) / 2
    // fitness feeds endurance/energy/calm; mind feeds calm/focus/sleep → calm summed across both.
    expect((r.capacityPoints.endurance ?? 0)).toBeGreaterThan(0);
    expect((r.capacityPoints.calm ?? 0)).toBeGreaterThan(0);
  });

  it('omits ratingAvg when no ratings were given', () => {
    const r = rollupForDay([session({ d: 15, durationSec: 600 })], '2026-06-15');
    expect(r.ratingAvg).toBeUndefined();
  });

  it('returns an empty rollup for a day with no sessions', () => {
    const r = rollupForDay([], '2026-06-15');
    expect(r).toEqual({ dayKey: '2026-06-15', perCategoryMin: {}, perCategoryDone: {}, capacityPoints: {}, sessions: 0 });
  });
});

describe('rollupDays', () => {
  it('produces one rollup per active day', () => {
    const map = rollupDays([session({ d: 15 }), session({ d: 16 }), session({ d: 16 })]);
    expect(Object.keys(map).sort()).toEqual(['2026-06-15', '2026-06-16']);
    expect(map['2026-06-16']!.sessions).toBe(2);
  });
});

describe('mergeRollups', () => {
  it('lets recent days overwrite stored history (idempotent re-snapshot)', () => {
    const history = rollupDays([session({ d: 15, durationSec: 600 })]);
    const recent = rollupDays([session({ d: 15, durationSec: 1200 }), session({ d: 16 })]);
    const merged = mergeRollups(history, recent);
    expect(merged['2026-06-15']!.perCategoryMin.fitness).toBe(20); // recent wins
    expect(merged['2026-06-16']).toBeDefined();
  });
});
