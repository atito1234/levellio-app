import { activityStreakDays, isSolidified, SOLIDIFY_DAYS } from './activityStreak';

const at = (key: string) => new Date(`${key}T09:00:00`).getTime();

describe('activityStreakDays', () => {
  it('counts consecutive days ending today', () => {
    const sessions = [
      { activityId: 'a', createdAt: at('2026-06-15') },
      { activityId: 'a', createdAt: at('2026-06-14') },
      { activityId: 'a', createdAt: at('2026-06-13') },
      { activityId: 'b', createdAt: at('2026-06-15') }, // other activity ignored
    ];
    expect(activityStreakDays(sessions, 'a', '2026-06-15')).toBe(3);
  });

  it('counts a run ending yesterday when today is not yet done', () => {
    const sessions = [
      { activityId: 'a', createdAt: at('2026-06-14') },
      { activityId: 'a', createdAt: at('2026-06-13') },
    ];
    expect(activityStreakDays(sessions, 'a', '2026-06-15')).toBe(2);
  });

  it('breaks on a gap', () => {
    const sessions = [
      { activityId: 'a', createdAt: at('2026-06-15') },
      { activityId: 'a', createdAt: at('2026-06-13') }, // gap on the 14th
    ];
    expect(activityStreakDays(sessions, 'a', '2026-06-15')).toBe(1);
  });

  it('is 0 when neither today nor yesterday has a session', () => {
    expect(activityStreakDays([{ activityId: 'a', createdAt: at('2026-06-10') }], 'a', '2026-06-15')).toBe(0);
  });

  it('counts same-day duplicates once', () => {
    const sessions = [
      { activityId: 'a', createdAt: at('2026-06-15') },
      { activityId: 'a', createdAt: new Date('2026-06-15T20:00:00').getTime() },
    ];
    expect(activityStreakDays(sessions, 'a', '2026-06-15')).toBe(1);
  });
});

describe('isSolidified', () => {
  it('locks in at the threshold', () => {
    expect(isSolidified(SOLIDIFY_DAYS - 1)).toBe(false);
    expect(isSolidified(SOLIDIFY_DAYS)).toBe(true);
  });
});
