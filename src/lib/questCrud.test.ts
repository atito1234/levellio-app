import { addQuestToList, updateQuestInList, removeQuestFromList, upsertQuestByCanonical } from './questCrud';
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

describe('upsertQuestByCanonical', () => {
  it('appends when no same-key quest exists, stamping the canonical key', () => {
    const res = upsertQuestByCanonical([quest('a')], quest('b', { title: 'New thing' }));
    expect(res.merged).toBe(false);
    expect(res.quests).toHaveLength(2);
    expect(res.quest.canonicalKey).toBe('new thing');
  });

  it('merges into the existing same-title quest instead of duplicating', () => {
    const existing = quest('a', { title: '20-minute workout' });
    const incoming = quest('z', { title: '20-Minute Workout', completed: true, lastCompletedDate: '2026-06-15' });
    const res = upsertQuestByCanonical([existing], incoming);
    expect(res.merged).toBe(true);
    expect(res.quests).toHaveLength(1); // no duplicate
    expect(res.quest.id).toBe('a'); // keeps the existing id (plan/bucket links survive)
    expect(res.quest.completed).toBe(true);
  });
});
