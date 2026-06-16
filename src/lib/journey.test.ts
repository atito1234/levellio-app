import { activityDayCells, activityJourney, activityWeeklyAdherence, automaticityCurve, HABIT_DAYS } from './journey';
import { SOLIDIFY_DAYS } from './activityStreak';
import { shiftDayKey } from './dates';
import type { ActivitySessionEvent } from './metadata';

const TODAY = '2026-06-15';

const sess = (dayKey: string, activityId = 'a'): ActivitySessionEvent => {
  const [y, m, d] = dayKey.split('-').map(Number);
  return {
    id: `${dayKey}-${activityId}`,
    type: 'activity_session',
    createdAt: new Date(y!, m! - 1, d!, 12).getTime(),
    appVersion: 'test',
    activityId,
    method: 'manual',
    durationSec: 0,
  };
};

/** Build a run of consecutive days ending today. */
const streak = (n: number, activityId = 'a'): ActivitySessionEvent[] =>
  Array.from({ length: n }, (_, i) => sess(shiftDayKey(TODAY, -(n - 1 - i)), activityId));

describe('activityDayCells', () => {
  it('returns one cell per day, oldest first, today last', () => {
    const cells = activityDayCells([sess(TODAY)], 'a', TODAY, 7);
    expect(cells).toHaveLength(7);
    expect(cells[6]!.isToday).toBe(true);
    expect(cells[6]!.done).toBe(true);
    expect(cells[0]!.done).toBe(false);
  });

  it('only marks the requested activity', () => {
    const cells = activityDayCells([sess(TODAY, 'b')], 'a', TODAY, 3);
    expect(cells.every((c) => !c.done)).toBe(true);
  });
});

describe('activityJourney', () => {
  it('is "new" with no history', () => {
    const j = activityJourney([], 'a', 'Walk', TODAY);
    expect(j.status).toBe('new');
    expect(j.currentStreak).toBe(0);
    expect(j.totalDays).toBe(0);
  });

  it('is "building" on a short streak', () => {
    const j = activityJourney(streak(3), 'a', 'Walk', TODAY);
    expect(j.status).toBe('building');
    expect(j.currentStreak).toBe(3);
  });

  it('is "solidified" at the solidify threshold', () => {
    const j = activityJourney(streak(SOLIDIFY_DAYS), 'a', 'Walk', TODAY);
    expect(j.status).toBe('solidified');
    expect(j.solidified).toBe(true);
    expect(j.graduated).toBe(false);
  });

  it('is "graduated" at the habit threshold', () => {
    const j = activityJourney(streak(HABIT_DAYS), 'a', 'Walk', TODAY);
    expect(j.status).toBe('graduated');
    expect(j.graduated).toBe(true);
    expect(j.progressPct).toBe(100);
  });

  it('tracks the span since the first day', () => {
    const j = activityJourney([sess(shiftDayKey(TODAY, -9)), sess(TODAY)], 'a', 'Walk', TODAY);
    expect(j.totalDays).toBe(2);
    expect(j.daysSinceStart).toBe(10);
  });
});

describe('activityWeeklyAdherence', () => {
  it('returns one value per week, oldest first', () => {
    expect(activityWeeklyAdherence([], 'a', TODAY, 8)).toHaveLength(8);
  });

  it('reflects a recent streak in the most recent weeks', () => {
    const series = activityWeeklyAdherence(streak(14), 'a', TODAY, 8);
    expect(series[7]).toBeCloseTo(1, 5); // this week fully done
    expect(series[6]).toBeCloseTo(1, 5); // last week fully done
    expect(series[0]).toBeCloseTo(0, 5); // 8 weeks ago: nothing
  });
});

describe('automaticityCurve', () => {
  it('rises monotonically from near 0 toward 1', () => {
    const c = automaticityCurve(12);
    expect(c[0]).toBeCloseTo(0, 5);
    expect(c[c.length - 1]!).toBeGreaterThan(0.9);
    for (let i = 1; i < c.length; i += 1) expect(c[i]!).toBeGreaterThan(c[i - 1]!);
  });
});
