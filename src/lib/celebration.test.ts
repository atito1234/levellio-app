import { getCelebrationTimings } from './celebration';

describe('getCelebrationTimings (reduced-motion fallback)', () => {
  it('snaps to a static state when reduced motion is on', () => {
    const t = getCelebrationTimings(true);
    expect(t.animate).toBe(false);
    expect(t.confetti).toBe(false);
    expect(t.xpCountMs).toBe(0);
    expect(t.barFillMs).toBe(0);
    expect(t.popDelayMs).toBe(0);
  });

  it('animates with confetti and positive durations otherwise', () => {
    const t = getCelebrationTimings(false);
    expect(t.animate).toBe(true);
    expect(t.confetti).toBe(true);
    expect(t.xpCountMs).toBeGreaterThan(0);
    expect(t.barFillMs).toBeGreaterThan(0);
    expect(t.popDelayMs).toBeGreaterThan(0);
  });
});
