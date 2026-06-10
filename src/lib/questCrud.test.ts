import { addQuestToList, updateQuestInList, removeQuestFromList } from './questCrud';
import type { Quest } from '@/types';

const quest = (id: string, over: Partial<Quest> = {}): Quest => ({
  id,
  title: `Quest ${id}`,
  category: 'health',
  difficulty: 'easy',
  baseXp: 20,
  completed: false,
  ...over,
});

describe('quest CRUD list ops', () => {
  it('adds a quest immutably', () => {
    const list = [quest('a')];
    const next = addQuestToList(list, quest('b'));
    expect(next).toHaveLength(2);
    expect(list).toHaveLength(1); // original untouched
  });

  it('updates fields by id while preserving id', () => {
    const list = [quest('a'), quest('b')];
    const next = updateQuestInList(list, 'b', { title: 'Renamed', difficulty: 'hard', baseXp: 70 });
    expect(next[1]?.title).toBe('Renamed');
    expect(next[1]?.id).toBe('b');
    expect(next[0]?.title).toBe('Quest a');
  });

  it('does not allow id to be overwritten via patch', () => {
    const list = [quest('a')];
    const next = updateQuestInList(list, 'a', { id: 'hacked' } as Partial<Quest>);
    expect(next[0]?.id).toBe('a');
  });

  it('removes a quest by id', () => {
    const list = [quest('a'), quest('b')];
    expect(removeQuestFromList(list, 'a')).toEqual([quest('b')]);
  });
});
