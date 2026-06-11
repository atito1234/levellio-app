import { BucketStore, normalizeBucketState } from './bucketStore';
import { assignActivity, createBucket, EMPTY_BUCKET_STATE } from '@/lib/buckets';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

describe('normalizeBucketState', () => {
  it('returns an empty state for junk', () => {
    expect(normalizeBucketState(null)).toEqual({ buckets: [], assignments: {} });
    expect(normalizeBucketState({ buckets: 'nope' })).toEqual({ buckets: [], assignments: {} });
  });

  it('drops invalid bucket fields back to safe defaults', () => {
    const state = normalizeBucketState({
      buckets: [{ id: 'b1', name: 'X', iconId: 'bogus', colorId: 'bogus', createdAt: 5, order: 0 }],
    });
    expect(state.buckets[0]!.iconId).toBe('target');
    expect(state.buckets[0]!.colorId).toBe('violet');
  });

  it('drops assignments pointing at missing buckets', () => {
    const state = normalizeBucketState({
      buckets: [{ id: 'b1', name: 'X', iconId: 'heart', colorId: 'teal', createdAt: 1, order: 0 }],
      assignments: { q1: 'b1', q2: 'ghost' },
    });
    expect(state.assignments).toEqual({ q1: 'b1' });
  });

  it('renumbers order and removes duplicate ids', () => {
    const state = normalizeBucketState({
      buckets: [
        { id: 'b1', name: 'A', iconId: 'heart', colorId: 'teal', createdAt: 1, order: 5 },
        { id: 'b1', name: 'dup', iconId: 'heart', colorId: 'teal', createdAt: 1, order: 6 },
        { id: 'b2', name: 'B', iconId: 'heart', colorId: 'teal', createdAt: 1, order: 2 },
      ],
    });
    expect(state.buckets.map((b) => b.id)).toEqual(['b2', 'b1']);
    expect(state.buckets.map((b) => b.order)).toEqual([0, 1]);
  });
});

describe('BucketStore', () => {
  it('returns empty state when nothing saved', async () => {
    const store = new BucketStore(new InMemoryStore());
    expect(await store.load('u1')).toEqual({ buckets: [], assignments: {} });
  });

  it('round-trips buckets + assignments', async () => {
    const store = new BucketStore(new InMemoryStore());
    let s = createBucket(EMPTY_BUCKET_STATE, { name: 'Health', iconId: 'heart', colorId: 'teal', now: 1 }).state;
    s = assignActivity(s, 'q1', s.buckets[0]!.id);
    await store.save('u1', s);
    const loaded = await store.load('u1');
    expect(loaded.buckets[0]!.name).toBe('Health');
    expect(loaded.assignments.q1).toBe(s.buckets[0]!.id);
  });
});
