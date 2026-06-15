import { buildMotivation, type MotivationContext } from './motivation';
import { SOLIDIFY_DAYS } from './activityStreak';

// A Wednesday with history; no progress yet, no streak.
const base: MotivationContext = {
  now: new Date('2026-06-17T08:00:00'),
  streakDays: 0,
  doneToday: 0,
  plannedToday: 3,
  hasHistory: true,
  bestWeekday: null,
  bestHour: null,
  goalTitles: [],
};

const ctx = (over: Partial<MotivationContext> = {}): MotivationContext => ({ ...base, ...over });

describe('buildMotivation', () => {
  it('protects an active streak when nothing is done yet', () => {
    const m = buildMotivation(ctx({ streakDays: 5 }));
    expect(m.source).toBe('streak');
    expect(m.text).toContain('5-day streak');
  });

  it('uses the fresh-start effect on a Monday with no streak', () => {
    const monday = new Date('2026-06-15T08:00:00'); // a Monday
    const m = buildMotivation(ctx({ now: monday }));
    expect(m.source).toBe('science');
    expect(m.text).toContain('New week');
  });

  it('uses the fresh-start effect on the 1st of the month', () => {
    const first = new Date('2026-06-01T08:00:00');
    const m = buildMotivation(ctx({ now: first }));
    expect(m.text).toContain('New month');
  });

  it('celebrates a finished plan', () => {
    const m = buildMotivation(ctx({ doneToday: 3, plannedToday: 3, streakDays: 4 }));
    expect(m.source).toBe('progress');
    expect(m.text).toContain('Plan done');
  });

  it('encourages finishing mid-plan', () => {
    const m = buildMotivation(ctx({ doneToday: 1, plannedToday: 3 }));
    expect(m.source).toBe('progress');
    expect(m.text).toContain('2 to go');
  });

  it('nudges a habit toward the solidification point using real history', () => {
    const m = buildMotivation(ctx({ topActivity: { title: 'Meditate', streakDays: 6 } }));
    expect(m.source).toBe('history');
    expect(m.text).toContain('6 days strong');
    expect(m.text).toContain(`${SOLIDIFY_DAYS - 6} more`);
  });

  it('leans into the strongest weekday when it is today', () => {
    // Wednesday = 3; base.now is a Wednesday.
    const m = buildMotivation(ctx({ bestWeekday: 3 }));
    expect(m.source).toBe('history');
    expect(m.text).toContain('strongest day');
  });

  it('falls back to a goal tie-in when there is no actionable history', () => {
    const m = buildMotivation(ctx({ goalTitles: ['Be a better partner'] }));
    expect(m.source).toBe('goal');
    expect(m.text).toContain('Be a better partner');
  });

  it('uses an honest science line with no history and no goals (no fabricated stats)', () => {
    const m = buildMotivation(ctx({ hasHistory: false }));
    expect(m.source).toBe('science');
    expect(m.text).not.toMatch(/\d/); // no numbers invented from nothing
  });
});
