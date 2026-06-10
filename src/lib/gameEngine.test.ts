import { completeQuest } from './gameEngine';
import { QUEST_XP, xpForNextLevel } from './leveling';
import type { Character } from '@/types';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

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

describe('completeQuest (engine)', () => {
  it('starts a streak and applies the day-1 bonus', () => {
    const { character, reward, isNewStreakDay } = completeQuest(
      makeCharacter(),
      QUEST_XP.medium,
      'q1',
      at(2026, 6, 10),
    );
    expect(character.streakDays).toBe(1);
    expect(character.lastCompletionDate).toBe('2026-06-10');
    expect(reward.totalXp).toBe(44); // 40 * 1.1
    expect(reward.bonusXp).toBe(4);
    expect(reward.streakDays).toBe(1);
    expect(isNewStreakDay).toBe(true);
  });

  it('does not advance the streak for same-day completions but still awards XP', () => {
    let character = makeCharacter();
    const first = completeQuest(character, QUEST_XP.easy, 'q1', at(2026, 6, 10, 9));
    character = first.character;
    const second = completeQuest(character, QUEST_XP.easy, 'q2', at(2026, 6, 10, 18));

    expect(second.character.streakDays).toBe(1); // unchanged
    expect(second.isNewStreakDay).toBe(false);
    expect(second.reward.totalXp).toBe(22); // 20 * 1.1, still awarded
    expect(second.character.xp).toBe(first.character.xp + 22);
  });

  it('grows the streak and bonus across consecutive days', () => {
    let character = makeCharacter();
    character = completeQuest(character, QUEST_XP.easy, 'd1', at(2026, 6, 10)).character;
    character = completeQuest(character, QUEST_XP.easy, 'd2', at(2026, 6, 11)).character;
    const day3 = completeQuest(character, QUEST_XP.easy, 'd3', at(2026, 6, 12));
    expect(day3.character.streakDays).toBe(3);
    expect(day3.reward.totalXp).toBe(26); // 20 * 1.3
  });

  it('caps the streak bonus at +100%', () => {
    const character = makeCharacter({ streakDays: 14, lastCompletionDate: '2026-06-10' });
    const { reward } = completeQuest(character, QUEST_XP.hard, 'q1', at(2026, 6, 11));
    expect(reward.streakDays).toBe(15);
    expect(reward.totalXp).toBe(140); // 70 * 2.0 (capped)
  });

  it('resets the streak after a missed day', () => {
    const character = makeCharacter({ streakDays: 9, lastCompletionDate: '2026-06-10' });
    const { character: next, reward, streakReset } = completeQuest(
      character,
      QUEST_XP.medium,
      'q1',
      at(2026, 6, 13),
    );
    expect(next.streakDays).toBe(1);
    expect(streakReset).toBe(true);
    expect(reward.totalXp).toBe(44); // back to 40 * 1.1
  });

  it('handles multi-level jumps and updates tier/companion', () => {
    const character = makeCharacter({ level: 7, xp: 0, streakDays: 14, lastCompletionDate: '2026-06-10' });
    // 15-day streak -> 2.0x. Award base 1500 -> 3000 XP.
    const { character: next, reward } = completeQuest(character, 1500, 'q1', at(2026, 6, 11));
    expect(reward.totalXp).toBe(3000);
    expect(next.level).toBeGreaterThanOrEqual(8);
    expect(next.tier).toBe(next.level >= 20 ? 'luminary' : 'pathfinder');
    expect(next.companionStage).toBe(next.level >= 20 ? 'phoenixling' : 'ember');
  });

  it('does not mutate the input character', () => {
    const character = makeCharacter({ level: 3, xp: 50 });
    completeQuest(character, 500, 'q1', at(2026, 6, 10));
    expect(character.level).toBe(3);
    expect(character.xp).toBe(50);
    expect(character.lastCompletionDate).toBeUndefined();
  });

  it('carries the XP remainder correctly on a single level-up', () => {
    const character = makeCharacter({ level: 1, xp: 0 }); // needs 100 for level 2
    // streak day-1 = 1.1x; pick base so total crosses 100 once.
    const { character: next, reward } = completeQuest(character, 100, 'q1', at(2026, 6, 10));
    expect(reward.totalXp).toBe(110); // 100 * 1.1
    expect(next.level).toBe(2);
    expect(next.xp).toBe(110 - xpForNextLevel(1)); // 10
  });
});
