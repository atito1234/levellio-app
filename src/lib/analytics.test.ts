import {
  byActivity,
  byCategory,
  formatMinutes,
  hourLabel,
  sessionsForDay,
  sessionsOf,
  summarize,
  weekdayLabel,
} from './analytics';
import type { ActivitySessionEvent, MetadataEvent } from './metadata';

function session(p: Partial<ActivitySessionEvent>): ActivitySessionEvent {
  return {
    id: p.id ?? 'e',
    type: 'activity_session',
    createdAt: p.createdAt ?? Date.UTC(2026, 5, 14, 12, 0),
    appVersion: '1.0.0',
    activityId: p.activityId ?? 'q1',
    title: p.title ?? 'Walk',
    category: p.category ?? 'fitness',
    method: p.method ?? 'timer',
    durationSec: p.durationSec ?? 600,
    hourOfDay: p.hourOfDay,
    weekday: p.weekday,
  };
}

describe('sessionsOf', () => {
  it('keeps only activity_session events', () => {
    const events: MetadataEvent[] = [
      session({}),
      { id: 'p', type: 'habit_provenance', createdAt: 1, appVersion: '1', bucketId: 'b', action: 'created' },
    ];
    expect(sessionsOf(events)).toHaveLength(1);
  });
});

describe('summarize', () => {
  it('totals time, averages only timed sessions, and finds best hour/weekday', () => {
    const s = summarize([
      session({ durationSec: 600, hourOfDay: 7, weekday: 1 }),
      session({ durationSec: 1200, hourOfDay: 7, weekday: 2 }),
      session({ durationSec: 0, hourOfDay: 20, weekday: 1, method: 'manual' }),
    ]);
    expect(s.count).toBe(3);
    expect(s.totalMin).toBe(30); // 10 + 20 + 0
    expect(s.avgMin).toBe(15); // (10+20)/2 timed
    expect(s.bestHour).toBe(7);
    expect(s.bestWeekday).toBe(1);
  });

  it('handles empty + missing time fields', () => {
    expect(summarize([]).bestHour).toBeNull();
    expect(summarize([session({ durationSec: 0, hourOfDay: undefined })]).avgMin).toBeNull();
  });
});

describe('grouping', () => {
  const sessions = [
    session({ activityId: 'q1', title: 'Walk', category: 'fitness' }),
    session({ activityId: 'q1', title: 'Walk', category: 'fitness' }),
    session({ activityId: 'q2', title: 'Read', category: 'learning' }),
  ];

  it('groups by category, most active first', () => {
    const cats = byCategory(sessions);
    expect(cats[0]).toMatchObject({ category: 'fitness' });
    expect(cats[0]!.summary.count).toBe(2);
  });

  it('groups by activity with a title', () => {
    const acts = byActivity(sessions);
    expect(acts[0]).toMatchObject({ activityId: 'q1', title: 'Walk' });
  });
});

describe('day filter', () => {
  it('selects sessions for a given local day', () => {
    const s = [session({ createdAt: new Date(2026, 5, 14, 9).getTime() }), session({ createdAt: new Date(2026, 5, 13, 9).getTime() })];
    expect(sessionsForDay(s, '2026-06-14')).toHaveLength(1);
  });
});

describe('labels', () => {
  it('formats hours, weekdays, minutes', () => {
    expect(hourLabel(0)).toBe('12 AM');
    expect(hourLabel(7)).toBe('7 AM');
    expect(hourLabel(13)).toBe('1 PM');
    expect(weekdayLabel(1)).toBe('Mon');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(120)).toBe('2h');
  });
});
