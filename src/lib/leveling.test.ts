import {
  QUEST_XP,
  xpForNextLevel,
  streakMultiplier,
  awardedXp,
  levelProgress,
  tierForLevel,
  companionStageForLevel,
  levelsToNextTier,
  lifetimeXp,
  applyQuestCompletion,
  TIER_START_LEVEL,
} from './leveling';
import type { Character } from '@/types';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test',
    name: 'Test',
    presentation: 'neutral',
    level: 1,
    xp: 0,
    streakDays: 0,
    tier: 'novice',
    companionStage: 'spark',
    ...overrides,
  };
}

describe('xpForNextLevel (100 * level^1.5)', () => {
  it('matches the formula across several levels', () => {
    expect(xpForNextLevel(1)).toBe(100); // 100 * 1
    expect(xpForNextLevel(2)).toBe(Math.floor(100 * Math.pow(2, 1.5))); // 282
    expect(xpForNextLevel(4)).toBe(800); // 100 * 8
    expect(xpForNextLevel(9)).toBe(2700); // 100 * 27
    expect(xpForNextLevel(16)).toBe(6400); // 100 * 64
  });

  it('is monotonically increasing', () => {
    for (let l = 1; l < 30; l += 1) {
      expect(xpForNextLevel(l + 1)).toBeGreaterThan(xpForNextLevel(l));
    }
  });

  it('clamps invalid levels to at least level 1', () => {
    expect(xpForNextLevel(0)).toBe(100);
    expect(xpForNextLevel(-5)).toBe(100);
  });
});

describe('quest XP awards', () => {
  it('awards 20 / 40 / 70 for easy / medium / hard', () => {
    expect(QUEST_XP.easy).toBe(20);
    expect(QUEST_XP.medium).toBe(40);
    expect(QUEST_XP.hard).toBe(70);
  });
});

describe('streak bonus (caps at +100%)', () => {
  it('is 1.0x with no streak', () => {
    expect(streakMultiplier(0)).toBe(1);
  });

  it('adds 10% per streak day', () => {
    expect(streakMultiplier(1)).toBeCloseTo(1.1);
    expect(streakMultiplier(5)).toBeCloseTo(1.5);
  });

  it('caps at +100% (2.0x) for 10+ day streaks', () => {
    expect(streakMultiplier(10)).toBe(2);
    expect(streakMultiplier(50)).toBe(2);
  });

  it('treats negative streaks as zero', () => {
    expect(streakMultiplier(-3)).toBe(1);
  });

  it('awardedXp applies the multiplier and rounds', () => {
    expect(awardedXp(40, 0)).toBe(40);
    expect(awardedXp(40, 3)).toBe(52); // 40 * 1.3
    expect(awardedXp(70, 10)).toBe(140); // capped 2.0x
    expect(awardedXp(20, 5)).toBe(30); // 20 * 1.5
  });
});

describe('levelProgress', () => {
  it('reports the fraction toward the next level', () => {
    expect(levelProgress({ level: 1, xp: 0 })).toBe(0);
    expect(levelProgress({ level: 1, xp: 50 })).toBeCloseTo(0.5); // 50 / 100
  });

  it('never exceeds 1', () => {
    expect(levelProgress({ level: 1, xp: 999 })).toBe(1);
  });
});

describe('tier derivation boundaries (Novice -> Pathfinder -> Luminary)', () => {
  it('is Novice below the Pathfinder threshold', () => {
    expect(tierForLevel(1)).toBe('novice');
    expect(tierForLevel(TIER_START_LEVEL.pathfinder - 1)).toBe('novice');
  });

  it('becomes Pathfinder exactly at the threshold', () => {
    expect(tierForLevel(TIER_START_LEVEL.pathfinder)).toBe('pathfinder');
    expect(tierForLevel(TIER_START_LEVEL.luminary - 1)).toBe('pathfinder');
  });

  it('becomes Luminary exactly at the threshold', () => {
    expect(tierForLevel(TIER_START_LEVEL.luminary)).toBe('luminary');
    expect(tierForLevel(99)).toBe('luminary');
  });
});

describe('companion derivation boundaries (Spark -> Ember -> Phoenixling)', () => {
  it('mirrors the hero tier boundaries', () => {
    expect(companionStageForLevel(1)).toBe('spark');
    expect(companionStageForLevel(TIER_START_LEVEL.pathfinder - 1)).toBe('spark');
    expect(companionStageForLevel(TIER_START_LEVEL.pathfinder)).toBe('ember');
    expect(companionStageForLevel(TIER_START_LEVEL.luminary - 1)).toBe('ember');
    expect(companionStageForLevel(TIER_START_LEVEL.luminary)).toBe('phoenixling');
  });
});

describe('levelsToNextTier', () => {
  it('counts down to the next tier within Novice', () => {
    expect(levelsToNextTier(1)).toBe(7);
    expect(levelsToNextTier(7)).toBe(1);
  });

  it('counts down to Luminary within Pathfinder', () => {
    expect(levelsToNextTier(8)).toBe(12);
    expect(levelsToNextTier(19)).toBe(1);
  });

  it('returns null at the top tier', () => {
    expect(levelsToNextTier(20)).toBeNull();
    expect(levelsToNextTier(40)).toBeNull();
  });
});

describe('lifetimeXp', () => {
  it('is just current xp at level 1', () => {
    expect(lifetimeXp({ level: 1, xp: 40 })).toBe(40);
  });

  it('sums all completed levels plus current xp', () => {
    // level 3 means levels 1 and 2 are fully cleared.
    const expected = xpForNextLevel(1) + xpForNextLevel(2) + 25;
    expect(lifetimeXp({ level: 3, xp: 25 })).toBe(expected);
  });
});

describe('applyQuestCompletion', () => {
  it('adds XP without leveling up when below the threshold', () => {
    const character = makeCharacter({ level: 1, xp: 0 });
    const { character: next, reward } = applyQuestCompletion(character, QUEST_XP.easy, 'q1');
    expect(reward.totalXp).toBe(20);
    expect(reward.bonusXp).toBe(0);
    expect(reward.leveledUp).toBe(false);
    expect(next.level).toBe(1);
    expect(next.xp).toBe(20);
  });

  it('includes the streak bonus in the reward', () => {
    const character = makeCharacter({ level: 1, xp: 0, streakDays: 5 });
    const { reward } = applyQuestCompletion(character, QUEST_XP.medium, 'q1');
    expect(reward.totalXp).toBe(60); // 40 * 1.5
    expect(reward.bonusXp).toBe(20);
  });

  it('crosses a single level threshold and carries the remainder', () => {
    // needs 100 to reach level 2; award 70 twice = 140 -> level 2 with 40 left.
    let character = makeCharacter({ level: 1, xp: 0 });
    character = applyQuestCompletion(character, QUEST_XP.hard, 'q1').character; // 70
    const { character: next, reward } = applyQuestCompletion(character, QUEST_XP.hard, 'q2'); // +70
    expect(reward.leveledUp).toBe(true);
    expect(next.level).toBe(2);
    expect(next.xp).toBe(40); // 140 - 100
  });

  it('handles multi-level jumps from a single large award', () => {
    // level 1 needs 100, level 2 needs 282 -> 400 XP clears both, lands level 3.
    const character = makeCharacter({ level: 1, xp: 0, streakDays: 10 });
    const { character: next, reward } = applyQuestCompletion(character, 200, 'q1'); // 200 * 2.0 = 400
    expect(reward.totalXp).toBe(400);
    expect(reward.leveledUp).toBe(true);
    expect(next.level).toBe(3);
    expect(next.xp).toBe(400 - xpForNextLevel(1) - xpForNextLevel(2)); // 400 - 100 - 282 = 18
  });

  it('updates tier and companion when a boundary is crossed', () => {
    const character = makeCharacter({ level: 7, xp: 0 });
    // Award enough to reach level 8 (needs xpForNextLevel(7)).
    const { character: next } = applyQuestCompletion(character, xpForNextLevel(7), 'q1');
    expect(next.level).toBe(8);
    expect(next.tier).toBe('pathfinder');
    expect(next.companionStage).toBe('ember');
  });

  it('does not mutate the input character', () => {
    const character = makeCharacter({ level: 1, xp: 0 });
    applyQuestCompletion(character, 500, 'q1');
    expect(character.level).toBe(1);
    expect(character.xp).toBe(0);
  });
});
