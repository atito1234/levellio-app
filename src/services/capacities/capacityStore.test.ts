import { CapacityStore, normalizeLevels } from './capacityStore';
import { emptyLevels } from '@/lib/compounding';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

describe('normalizeLevels', () => {
  it('returns empty levels for junk', () => {
    expect(normalizeLevels(null)).toEqual(emptyLevels());
    expect(normalizeLevels({ levels: 'nope' })).toEqual(emptyLevels());
  });

  it('keeps valid numbers, clamps to 0-100, ignores unknown keys', () => {
    const l = normalizeLevels({ levels: { hydration: 120, energy: 30, bogus: 50, calm: -5 } });
    expect(l.hydration).toBe(100);
    expect(l.energy).toBe(30);
    expect(l.calm).toBe(0);
    expect((l as Record<string, number>).bogus).toBeUndefined();
  });
});

describe('CapacityStore', () => {
  it('returns empty levels when nothing saved', async () => {
    const store = new CapacityStore(new InMemoryStore());
    expect(await store.load('u1')).toEqual(emptyLevels());
  });

  it('round-trips levels', async () => {
    const store = new CapacityStore(new InMemoryStore());
    const levels = { ...emptyLevels(), hydration: 24, focus: 12 };
    await store.save('u1', levels);
    expect(await store.load('u1')).toEqual(levels);
  });
});
