import { migrateQuests } from './migrations';

describe('migrateQuests canonicalKey backfill', () => {
  it('backfills a canonical key from the title for legacy quests', () => {
    const out = migrateQuests([{ id: 'q1', title: '  20-Minute  Workout ', category: 'fitness', difficulty: 'medium' }]);
    expect(out[0]!.canonicalKey).toBe('20-minute workout');
  });

  it('survives malformed legacy blobs without crashing', () => {
    const out = migrateQuests([null, 42, { title: 'Read' }]);
    expect(out).toHaveLength(3);
    expect(out[0]!.title).toBe('Untitled quest');
    expect(out[2]!.canonicalKey).toBe('read');
  });

  it('returns an empty list for non-array input', () => {
    expect(migrateQuests(null)).toEqual([]);
  });
});
