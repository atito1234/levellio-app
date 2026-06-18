import { detectMilestones, projectBeats, STREAK_THRESHOLDS, type DetectArgs, type ProjectBeat } from './milestones';
import { SOLIDIFY_DAYS } from './activityStreak';
import { emptyLevels } from './compounding';
import type { Goal } from './goal';

const goal: Goal = {
  id: 'g1',
  title: 'Get fit',
  emoji: '💪',
  colorId: 'violet',
  categories: ['fitness'],
  createdAt: 0,
  order: 0,
};

function args(over: Partial<DetectArgs> = {}): DetectArgs {
  return {
    earnedIds: new Set<string>(),
    now: 1000,
    streakDays: 1,
    activity: { canonicalKey: 'go for a 5km run', title: 'Go for a 5km run', streakDays: 1 },
    prevLevels: emptyLevels(),
    levels: emptyLevels(),
    goals: [],
    contributingGoalIds: [],
    ...over,
  };
}

describe('detectMilestones', () => {
  it('fires a streak milestone on reaching a threshold', () => {
    const out = detectMilestones(args({ streakDays: 7 }));
    const ids = out.map((m) => m.id);
    expect(ids).toContain('streak-3');
    expect(ids).toContain('streak-7');
    expect(ids).not.toContain('streak-14');
  });

  it('is idempotent against earned ids', () => {
    const out = detectMilestones(args({ streakDays: 7, earnedIds: new Set(['streak-3', 'streak-7']) }));
    expect(out.find((m) => m.kind === 'streak')).toBeUndefined();
  });

  it('fires activity_solid at the solidify threshold', () => {
    const out = detectMilestones(args({ activity: { canonicalKey: 'run', title: 'Run', streakDays: SOLIDIFY_DAYS } }));
    expect(out.find((m) => m.kind === 'activity_solid')?.id).toBe('activity_solid-run');
  });

  it('fires capacity_full only on the 100% crossing', () => {
    const prev = { ...emptyLevels(), endurance: 96 };
    const post = { ...emptyLevels(), endurance: 100 };
    expect(detectMilestones(args({ prevLevels: prev, levels: post })).map((m) => m.id)).toContain('capacity_full-endurance');
    // already at 100 before → no fire
    expect(
      detectMilestones(args({ prevLevels: post, levels: post })).find((m) => m.kind === 'capacity_full'),
    ).toBeUndefined();
  });

  it('strengthens contributing goals when a habit newly solidifies', () => {
    const out = detectMilestones(
      args({
        activity: { canonicalKey: 'run', title: 'Run', streakDays: SOLIDIFY_DAYS },
        goals: [goal],
        contributingGoalIds: ['g1'],
      }),
    );
    expect(out.find((m) => m.kind === 'goal')?.id).toBe('goal-g1-solid-run');
  });

  it('does not strengthen goals when the habit was already solid', () => {
    const out = detectMilestones(
      args({
        activity: { canonicalKey: 'run', title: 'Run', streakDays: SOLIDIFY_DAYS + 5 },
        earnedIds: new Set(['activity_solid-run']),
        goals: [goal],
        contributingGoalIds: ['g1'],
      }),
    );
    expect(out.find((m) => m.kind === 'goal')).toBeUndefined();
  });

  it('exposes the documented thresholds', () => {
    expect(STREAK_THRESHOLDS).toEqual([3, 7, 14, 30, 66]);
  });
});

describe('projectBeats', () => {
  const base: ProjectBeat = {
    projectId: 'p1',
    title: 'Fort-Liberté Malaria',
    emoji: '🦟',
    unit: 'sites cleaned',
    value: 3,
    colorId: 'teal',
    pct: 63,
    reachedGoal: false,
  };

  it('maps a normal contribution to a project beat with progress', () => {
    const m = projectBeats([base], 1000)[0]!;
    expect(m.kind).toBe('project');
    expect(m.emoji).toBe('🦟');
    expect(m.label).toBe('+3 sites cleaned → Fort-Liberté Malaria');
    expect(m.detail).toBe('63% of this week’s goal');
    expect(m.accentColorId).toBe('teal');
    expect(m.progressPct).toBe(63);
  });

  it('maps a goal-crossing to the gold team-win with the reward', () => {
    const m = projectBeats([{ ...base, pct: 100, reachedGoal: true, reward: 'Water filters' }], 1000)[0]!;
    expect(m.kind).toBe('project_goal');
    expect(m.accentColorId).toBe('gold');
    expect(m.progressPct).toBe(100);
    expect(m.detail).toBe('Reward unlocked: Water filters');
  });

  it('generates unique ids per beat (never deduped)', () => {
    const ms = projectBeats([base, { ...base, projectId: 'p2' }], 2000);
    expect(ms).toHaveLength(2);
    expect(new Set(ms.map((m) => m.id)).size).toBe(2);
  });

  it('returns nothing for no contributions', () => {
    expect(projectBeats([], 1000)).toEqual([]);
  });
});
