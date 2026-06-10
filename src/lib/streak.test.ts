import { advanceStreak } from './streak';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('advanceStreak', () => {
  it('starts a 1-day streak on the first completion', () => {
    const r = advanceStreak({ streakDays: 0 }, at(2026, 6, 10));
    expect(r.streakDays).toBe(1);
    expect(r.lastCompletionDate).toBe('2026-06-10');
    expect(r.isNewDay).toBe(true);
    expect(r.reset).toBe(false);
  });

  it('does not double-count multiple completions on the same day', () => {
    const r = advanceStreak(
      { streakDays: 4, lastCompletionDate: '2026-06-10' },
      at(2026, 6, 10, 20),
    );
    expect(r.streakDays).toBe(4);
    expect(r.isNewDay).toBe(false);
    expect(r.reset).toBe(false);
  });

  it('extends the streak on the next day', () => {
    const r = advanceStreak(
      { streakDays: 4, lastCompletionDate: '2026-06-10' },
      at(2026, 6, 11),
    );
    expect(r.streakDays).toBe(5);
    expect(r.isNewDay).toBe(true);
    expect(r.reset).toBe(false);
  });

  it('extends across a day boundary (23:59 -> 00:01)', () => {
    const r = advanceStreak(
      { streakDays: 2, lastCompletionDate: dateKey(at(2026, 6, 10, 23)) },
      at(2026, 6, 11, 0),
    );
    expect(r.streakDays).toBe(3);
  });

  it('extends across month boundaries', () => {
    const r = advanceStreak(
      { streakDays: 9, lastCompletionDate: '2026-01-31' },
      at(2026, 2, 1),
    );
    expect(r.streakDays).toBe(10);
  });

  it('resets to 1 after missing a day', () => {
    const r = advanceStreak(
      { streakDays: 8, lastCompletionDate: '2026-06-10' },
      at(2026, 6, 12),
    );
    expect(r.streakDays).toBe(1);
    expect(r.reset).toBe(true);
    expect(r.isNewDay).toBe(true);
  });

  it('resets when the clock moves backwards', () => {
    const r = advanceStreak(
      { streakDays: 5, lastCompletionDate: '2026-06-12' },
      at(2026, 6, 10),
    );
    expect(r.streakDays).toBe(1);
    expect(r.reset).toBe(true);
  });
});

// Local import kept out of the date helper to avoid coupling the test list.
function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
