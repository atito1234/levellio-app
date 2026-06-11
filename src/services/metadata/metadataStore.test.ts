import { MetadataStore, normalizeEvents, MAX_METADATA_EVENTS } from './metadataStore';
import { buildContributionEvent, DEFAULT_METADATA_PRIVACY } from '@/lib/metadata';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

const deps = { now: 1_700_000_000_000, appVersion: '1.0.0' };

function contrib(activityId: string) {
  return buildContributionEvent({ activityId, bucketId: 'b1' }, DEFAULT_METADATA_PRIVACY, deps)!;
}

describe('normalizeEvents', () => {
  it('keeps only well-formed events', () => {
    const ok = contrib('q1');
    const events = normalizeEvents({ events: [ok, { id: 'x' }, null, 42] });
    expect(events).toHaveLength(1);
    expect(events[0]!.id).toBe(ok.id);
  });
});

describe('MetadataStore', () => {
  it('appends and loads events', async () => {
    const store = new MetadataStore(new InMemoryStore());
    await store.append('u1', contrib('q1'));
    await store.append('u1', contrib('q2'));
    const events = await store.load('u1');
    expect(events.map((e) => (e.type === 'activity_contribution' ? e.activityId : ''))).toEqual([
      'q1',
      'q2',
    ]);
  });

  it('clears events', async () => {
    const store = new MetadataStore(new InMemoryStore());
    await store.append('u1', contrib('q1'));
    await store.clear('u1');
    expect(await store.load('u1')).toEqual([]);
  });

  it('caps stored events at the soft limit (trims oldest)', async () => {
    const store = new MetadataStore(new InMemoryStore());
    const mem = new InMemoryStore();
    // Pre-seed a large array directly to test the trim on next append.
    const many = Array.from({ length: MAX_METADATA_EVENTS + 5 }, (_, i) => contrib(`q${i}`));
    await mem.setItem('levellio:metadata:u1', JSON.stringify({ schema: 1, events: many }));
    const store2 = new MetadataStore(mem);
    const after = await store2.append('u1', contrib('last'));
    expect(after).toHaveLength(MAX_METADATA_EVENTS);
    const lastEvent = after[after.length - 1]!;
    expect(lastEvent.type === 'activity_contribution' && lastEvent.activityId).toBe('last');
  });
});
