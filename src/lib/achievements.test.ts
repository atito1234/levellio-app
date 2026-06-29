import { evaluateAchievements, groupStates, threshold, unlockedCount, type AchievementStats } from './achievements';
import { ACHIEVEMENTS } from '@/data/achievements';

function stats(over: Partial<AchievementStats> = {}): AchievementStats {
  return {
    completions: 0,
    daysAccomplished: 0,
    longestStreak: 0,
    currentStreak: 0,
    solidifiedCount: 0,
    graduatedCount: 0,
    maxCapacityLevel: 0,
    goalsCount: 0,
    battlesSlain: 0,
    ritesPerformed: 0,
    projectsJoined: 0,
    ...over,
  };
}

describe('threshold', () => {
  it('earns at the goal and scales progress, clamped', () => {
    expect(threshold(0, 30)).toEqual({ earned: false, progressPct: 0 });
    expect(threshold(15, 30)).toEqual({ earned: false, progressPct: 50 });
    expect(threshold(30, 30)).toEqual({ earned: true, progressPct: 100 });
    expect(threshold(45, 30)).toEqual({ earned: true, progressPct: 100 });
  });
});

describe('evaluateAchievements', () => {
  it('a brand-new user has nothing earned', () => {
    const states = evaluateAchievements(ACHIEVEMENTS, stats());
    expect(unlockedCount(states)).toBe(0);
  });

  it('earns the right badges from real stats', () => {
    const states = evaluateAchievements(
      ACHIEVEMENTS,
      stats({ completions: 5, longestStreak: 30, solidifiedCount: 1, goalsCount: 2, battlesSlain: 1 }),
    );
    const earned = new Set(states.filter((s) => s.earned).map((s) => s.def.id));
    expect(earned.has('first-step')).toBe(true);
    expect(earned.has('rhythm-3')).toBe(true);
    expect(earned.has('two-weeks-14')).toBe(true);
    expect(earned.has('resilient-30')).toBe(true);
    expect(earned.has('locked-in')).toBe(true);
    expect(earned.has('goal-setter')).toBe(true);
    expect(earned.has('dragon-slayer')).toBe(true);
    expect(earned.has('automatic-66')).toBe(false);
    expect(earned.has('dragon-hunter')).toBe(false);
  });

  it('shows partial progress on a locked badge', () => {
    const s = evaluateAchievements(ACHIEVEMENTS, stats({ battlesSlain: 4 }));
    const hunter = s.find((x) => x.def.id === 'dragon-hunter')!;
    expect(hunter.earned).toBe(false);
    expect(hunter.progressPct).toBe(40); // 4 / 10
  });
});

describe('groupStates', () => {
  it('buckets states by group in a stable order', () => {
    const groups = groupStates(evaluateAchievements(ACHIEVEMENTS, stats()));
    expect(groups.map((g) => g.group)).toEqual(['journey', 'habits', 'capacities', 'goals', 'battles', 'community']);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });
});
