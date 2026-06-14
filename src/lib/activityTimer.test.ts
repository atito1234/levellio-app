import { activityTiming, formatClock, parseDurationMinutes, POMODORO_MINUTES } from './activityTimer';

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

describe('formatClock', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3661)).toBe('1:01:01');
  });
});
