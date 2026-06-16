import { adherenceTrendSeries, categoryMinutesSeries, ratingTrendSeries, toSeries } from './series';
import type { ActivitySessionEvent } from '../metadata';
import type { Quest } from '@/types';

function session(p: Partial<ActivitySessionEvent> & { y: number; mo: number; d: number }): ActivitySessionEvent {
  return {
    id: p.id ?? `e-${p.d}`,
    type: 'activity_session',
    createdAt: new Date(p.y, p.mo - 1, p.d, 12, 0).getTime(),
    appVersion: '1.0.0',
    activityId: p.activityId ?? 'q1',
    title: p.title ?? 'Run',
    category: p.category ?? 'fitness',
    method: p.method ?? 'manual',
    durationSec: p.durationSec ?? 0,
    rating: p.rating,
  };
}

const WEEK = { start: '2026-06-14', end: '2026-06-20' };

describe('toSeries', () => {
  it('sizes confidence from the point span by default', () => {
    const s = toSeries({
      id: 'x',
      label: 'X',
      source: 'derived',
      points: [
        { dayKey: '2026-06-01', value: 1 },
        { dayKey: '2026-06-25', value: 2 },
      ],
    });
    expect(s.confidence).toBe('high'); // 25-day span
  });

  it('honours an explicit daysOfData override', () => {
    const s = toSeries({ id: 'x', label: 'X', source: 'sensor', points: [], daysOfData: 3 });
    expect(s.confidence).toBe('low');
    expect(s.source).toBe('sensor');
  });
});

describe('adherenceTrendSeries', () => {
  it('builds a derived % series from weekly adherence', () => {
    const q: Quest = {
      id: 'q1',
      title: 'Run',
      category: 'fitness',
      difficulty: 'easy',
      baseXp: 10,
      completed: false,
      scheduledDays: [1, 3, 5],
    };
    const s = adherenceTrendSeries({
      id: 'q1',
      kind: 'habit',
      label: 'Run',
      members: [q],
      sessions: [session({ y: 2026, mo: 6, d: 15 }), session({ y: 2026, mo: 6, d: 17 })],
      getPlan: () => undefined,
      range: WEEK,
    });
    expect(s.source).toBe('derived');
    expect(s.unit).toBe('%');
    expect(s.points).toEqual([{ dayKey: '2026-06-14', value: 67 }]);
  });
});

describe('categoryMinutesSeries', () => {
  it('zero-fills the range and sums minutes for the category', () => {
    const sessions = [
      session({ y: 2026, mo: 6, d: 15, durationSec: 600, category: 'fitness' }),
      session({ y: 2026, mo: 6, d: 15, durationSec: 600, category: 'fitness' }),
      session({ y: 2026, mo: 6, d: 16, durationSec: 300, category: 'mind' }),
    ];
    const s = categoryMinutesSeries(sessions, 'fitness', WEEK);
    expect(s.points).toHaveLength(7);
    expect(s.points.find((p) => p.dayKey === '2026-06-15')?.value).toBe(20);
    expect(s.points.find((p) => p.dayKey === '2026-06-16')?.value).toBe(0);
    expect(s.unit).toBe('min');
  });
});

describe('ratingTrendSeries', () => {
  it('averages ratings per day as a self-report series', () => {
    const sessions = [
      session({ y: 2026, mo: 6, d: 15, rating: 4 }),
      session({ y: 2026, mo: 6, d: 15, rating: 2 }),
      session({ y: 2026, mo: 6, d: 16, rating: 5 }),
      session({ y: 2026, mo: 6, d: 17 }), // no rating → ignored
    ];
    const s = ratingTrendSeries(sessions);
    expect(s.source).toBe('self-report');
    expect(s.points).toEqual([
      { dayKey: '2026-06-15', value: 3 },
      { dayKey: '2026-06-16', value: 5 },
    ]);
  });
});
