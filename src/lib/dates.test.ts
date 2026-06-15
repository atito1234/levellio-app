import { dayKey, dayDiff, shiftDayKey, relativeDayLabel } from './dates';

describe('shiftDayKey', () => {
  it('moves a day key forward and back across boundaries', () => {
    expect(shiftDayKey('2026-06-14', 1)).toBe('2026-06-15');
    expect(shiftDayKey('2026-06-14', -1)).toBe('2026-06-13');
    expect(shiftDayKey('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftDayKey('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('relativeDayLabel', () => {
  it('names today/tomorrow/yesterday relative to a reference', () => {
    expect(relativeDayLabel('2026-06-14', '2026-06-14')).toBe('Today');
    expect(relativeDayLabel('2026-06-15', '2026-06-14')).toBe('Tomorrow');
    expect(relativeDayLabel('2026-06-13', '2026-06-14')).toBe('Yesterday');
  });
});

describe('dayKey', () => {
  it('formats the local calendar day as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('zero-pads month and day', () => {
    expect(dayKey(new Date(2026, 2, 3, 0, 0))).toBe('2026-03-03');
  });

  it('treats different times on the same calendar day as one key', () => {
    expect(dayKey(new Date(2026, 5, 10, 0, 1))).toBe(dayKey(new Date(2026, 5, 10, 23, 59)));
  });
});

describe('dayDiff', () => {
  it('is zero for the same day', () => {
    expect(dayDiff('2026-06-10', '2026-06-10')).toBe(0);
  });

  it('counts consecutive days as 1', () => {
    expect(dayDiff('2026-06-10', '2026-06-11')).toBe(1);
  });

  it('handles month boundaries', () => {
    expect(dayDiff('2026-01-31', '2026-02-01')).toBe(1);
  });

  it('handles year boundaries', () => {
    expect(dayDiff('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('is negative when b precedes a', () => {
    expect(dayDiff('2026-06-11', '2026-06-10')).toBe(-1);
  });

  it('counts multi-day gaps', () => {
    expect(dayDiff('2026-06-10', '2026-06-13')).toBe(3);
  });
});
