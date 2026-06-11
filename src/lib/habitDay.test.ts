import { isDoneToday, markQuestDoneToday, rolloverQuests } from './habitDay';
import type { Quest } from '@/types';

const base: Quest = { id: 'q1', title: 'Water', category: 'health', difficulty: 'easy', baseXp: 20, completed: false };

describe('isDoneToday', () => {
  it('is true only when the last completion is today', () => {
    expect(isDoneToday({ lastCompletedDate: '2026-06-11' }, '2026-06-11')).toBe(true);
    expect(isDoneToday({ lastCompletedDate: '2026-06-10' }, '2026-06-11')).toBe(false);
    expect(isDoneToday({}, '2026-06-11')).toBe(false);
  });
});

describe('rolloverQuests', () => {
  it("re-opens yesterday's completions and keeps today's", () => {
    const quests: Quest[] = [
      { ...base, id: 'a', completed: true, lastCompletedDate: '2026-06-10' }, // stale → reset
      { ...base, id: 'b', completed: true, lastCompletedDate: '2026-06-11' }, // today → stays
      { ...base, id: 'c', completed: false }, // open → stays
    ];
    const { quests: out, changed } = rolloverQuests(quests, '2026-06-11');
    expect(changed).toBe(true);
    expect(out.find((q) => q.id === 'a')!.completed).toBe(false);
    expect(out.find((q) => q.id === 'b')!.completed).toBe(true);
    expect(out.find((q) => q.id === 'c')!.completed).toBe(false);
  });

  it('resets a legacy completed habit with no completion date', () => {
    const out = rolloverQuests([{ ...base, completed: true }], '2026-06-11');
    expect(out.changed).toBe(true);
    expect(out.quests[0]!.completed).toBe(false);
  });

  it('is a no-op (same reference) when nothing needs changing', () => {
    const quests: Quest[] = [{ ...base, completed: true, lastCompletedDate: '2026-06-11' }];
    const out = rolloverQuests(quests, '2026-06-11');
    expect(out.changed).toBe(false);
    expect(out.quests).toBe(quests);
  });
});

describe('markQuestDoneToday', () => {
  it('stamps the completion date and flag', () => {
    const out = markQuestDoneToday([base], 'q1', '2026-06-11');
    expect(out[0]!.completed).toBe(true);
    expect(out[0]!.lastCompletedDate).toBe('2026-06-11');
  });
});
