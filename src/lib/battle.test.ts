import { battleStateAt } from './battle';

describe('battleStateAt (timed)', () => {
  const total = 25 * 60;

  it('starts at full health, work phase', () => {
    const s = battleStateAt(total, 0);
    expect(s.dragonHealthPct).toBe(100);
    expect(s.phase).toBe('work');
    expect(s.won).toBe(false);
    expect(s.remainingSec).toBe(total);
  });

  it('drains health proportionally to elapsed time', () => {
    expect(battleStateAt(total, total / 2).dragonHealthPct).toBe(50);
  });

  it('slays the dragon at zero remaining', () => {
    const s = battleStateAt(total, total);
    expect(s.won).toBe(true);
    expect(s.phase).toBe('won');
    expect(s.dragonHealthPct).toBe(0);
  });

  it('clamps past the end', () => {
    const s = battleStateAt(total, total + 999);
    expect(s.remainingSec).toBe(0);
    expect(s.won).toBe(true);
  });
});

describe('battleStateAt (flowtime)', () => {
  it('never auto-wins and keeps health above the floor', () => {
    const start = battleStateAt(null, 0);
    expect(start.dragonHealthPct).toBe(100);
    expect(start.won).toBe(false);
    expect(start.remainingSec).toBeNull();

    const later = battleStateAt(null, 60 * 60); // an hour in
    expect(later.won).toBe(false);
    expect(later.dragonHealthPct).toBeGreaterThanOrEqual(10);
  });
});
