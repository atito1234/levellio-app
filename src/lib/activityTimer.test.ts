import { activityTiming, formatClock, isVerifiedDuration, parseDurationMinutes, POMODORO_MINUTES } from './activityTimer';

describe('parseDurationMinutes', () => {
  it('reads minutes from common phrasings', () => {
    expect(parseDurationMinutes('20-minute workout')).toBe(20);
    expect(parseDurationMinutes('Take a 15-minute walk')).toBe(15);
    expect(parseDurationMinutes('Meditate for 10 minutes')).toBe(10);
    expect(parseDurationMinutes('Do a 2-minute breathing exercise')).toBe(2);
    expect(parseDurationMinutes('Stretch for 5 minutes')).toBe(5);
  });

  it('reads hours', () => {
    expect(parseDurationMinutes('One 1 hour deep block')).toBe(60);
    expect(parseDurationMinutes('2-hour study')).toBe(120);
  });

  it('returns null when there is no duration', () => {
    expect(parseDurationMinutes('Drink a glass of water')).toBeNull();
    expect(parseDurationMinutes('Go for a 5km run')).toBeNull();
  });
});

describe('activityTiming', () => {
  it('is a fixed timer for timed activities', () => {
    expect(activityTiming({ title: '20-minute workout' })).toEqual({ timed: true, minutes: 20, method: 'timer' });
  });

  it('is a Pomodoro for open-ended activities', () => {
    expect(activityTiming({ title: 'Drink a glass of water' })).toEqual({
      timed: false,
      minutes: POMODORO_MINUTES,
      method: 'pomodoro',
    });
  });
});

describe('isVerifiedDuration', () => {
  it('is not verified for a zero/manual log', () => {
    expect(isVerifiedDuration(0, 1200)).toBe(false);
  });

  it('verifies when at least 90% of the target elapsed', () => {
    expect(isVerifiedDuration(1080, 1200)).toBe(true); // exactly 90%
    expect(isVerifiedDuration(1200, 1200)).toBe(true);
  });

  it('is self-reported when well short of the target', () => {
    expect(isVerifiedDuration(60, 1200)).toBe(false);
  });

  it('verifies any real elapsed time for an open-ended (Pomodoro) target', () => {
    expect(isVerifiedDuration(5, 0)).toBe(true);
    expect(isVerifiedDuration(0, 0)).toBe(false);
  });
});

describe('formatClock', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3661)).toBe('1:01:01');
  });
});
