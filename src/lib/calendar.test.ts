import { addMonths, buildMonthMatrix, intensityLevel, isFutureMonth, monthLabel, monthOf } from './calendar';

describe('month math', () => {
  it('reads the month of a date', () => {
    expect(monthOf(new Date(2026, 5, 14))).toEqual({ year: 2026, month: 5 });
  });

  it('shifts months with year wrap', () => {
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('labels a month', () => {
    expect(monthLabel({ year: 2026, month: 5 })).toBe('June 2026');
  });

  it('detects future months', () => {
    const now = new Date(2026, 5, 14);
    expect(isFutureMonth({ year: 2026, month: 6 }, now)).toBe(true);
    expect(isFutureMonth({ year: 2026, month: 5 }, now)).toBe(false);
    expect(isFutureMonth({ year: 2026, month: 4 }, now)).toBe(false);
  });
});

describe('buildMonthMatrix', () => {
  it('builds rectangular weeks with leading pad cells', () => {
    // June 2026: the 1st is a Monday → one leading blank (Sunday).
    const weeks = buildMonthMatrix({ year: 2026, month: 5 });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]![0]).toEqual({ key: null, day: null }); // Sunday pad
    expect(weeks[0]![1]).toEqual({ key: '2026-06-01', day: 1 }); // Monday = the 1st
    // 30 days in June
    const days = weeks.flat().filter((c) => c.day !== null);
    expect(days).toHaveLength(30);
    expect(days[29]).toEqual({ key: '2026-06-30', day: 30 });
  });
});

describe('intensityLevel', () => {
  it('buckets points into 0-4', () => {
    expect(intensityLevel(0)).toBe(0);
    expect(intensityLevel(3)).toBe(1);
    expect(intensityLevel(10)).toBe(2);
    expect(intensityLevel(20)).toBe(3);
    expect(intensityLevel(40)).toBe(4);
  });
});
