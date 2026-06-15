import { TECHNIQUES, getTechnique, workSeconds, clampCustomMinutes, CUSTOM_MIN_BOUNDS } from './timeTechniques';

describe('timeTechniques', () => {
  it('exposes all five techniques with unique ids', () => {
    const ids = TECHNIQUES.map((t) => t.id);
    expect(new Set(ids)).toEqual(new Set(['pomodoro', 'deepwork', 'quick10', 'custom', 'flowtime']));
  });

  it('getTechnique returns the matching technique and falls back safely', () => {
    expect(getTechnique('deepwork').workMin).toBe(52);
    expect(getTechnique('nope' as never).id).toBe('pomodoro');
  });

  it('workSeconds converts fixed techniques to seconds', () => {
    expect(workSeconds(getTechnique('pomodoro'))).toBe(25 * 60);
    expect(workSeconds(getTechnique('quick10'))).toBe(10 * 60);
  });

  it('workSeconds is null for Flowtime (no fixed end)', () => {
    expect(workSeconds(getTechnique('flowtime'))).toBeNull();
  });

  it('custom uses the provided minutes, clamped', () => {
    expect(workSeconds(getTechnique('custom'), 30)).toBe(30 * 60);
    expect(workSeconds(getTechnique('custom'), 9999)).toBe(CUSTOM_MIN_BOUNDS.max * 60);
    expect(workSeconds(getTechnique('custom'), 0)).toBe(CUSTOM_MIN_BOUNDS.min * 60);
    expect(workSeconds(getTechnique('custom'))).toBe(20 * 60); // default
  });

  it('clampCustomMinutes guards bad input', () => {
    expect(clampCustomMinutes(NaN)).toBe(20);
    expect(clampCustomMinutes(45.6)).toBe(46);
  });
});
