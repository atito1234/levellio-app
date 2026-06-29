import { stepGoalProgress, DEFAULT_STEP_GOAL } from './steps';

describe('stepGoalProgress', () => {
  it('computes a clamped percentage toward the goal', () => {
    expect(stepGoalProgress(0, 8000)).toEqual({ steps: 0, goal: 8000, pct: 0, reached: false });
    expect(stepGoalProgress(4000, 8000)).toEqual({ steps: 4000, goal: 8000, pct: 50, reached: false });
    expect(stepGoalProgress(8000, 8000)).toEqual({ steps: 8000, goal: 8000, pct: 100, reached: true });
  });

  it('caps at 100% past the goal and floors negatives', () => {
    expect(stepGoalProgress(12000, 8000)).toMatchObject({ pct: 100, reached: true });
    expect(stepGoalProgress(-50, 8000)).toMatchObject({ steps: 0, pct: 0 });
  });

  it('guards a zero/negative goal', () => {
    expect(stepGoalProgress(10, 0).reached).toBe(true); // goal floored to 1
  });

  it('exposes a sane default goal', () => {
    expect(DEFAULT_STEP_GOAL).toBeGreaterThan(0);
  });
});
