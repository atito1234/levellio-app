import { CapacityStore, normalizeHistory, normalizeLevels } from './capacityStore';
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

describe('normalizeHistory', () => {
  it('keeps only valid YYYY-MM-DD keys with positive numbers', () => {
    const h = normalizeHistory({
      history: { '2026-06-14': 12, '2026-06-13': 0, bad: 5, '2026-6-1': 3, '2026-06-12': 7.6 },
    });
    expect(h).toEqual({ '2026-06-14': 12, '2026-06-12': 8 });
  });

  it('returns {} for junk', () => {
    expect(normalizeHistory(null)).toEqual({});
  });
});

describe('CapacityStore', () => {
  it('returns empty data when nothing saved', async () => {
    const store = new CapacityStore(new InMemoryStore());
    expect(await store.load('u1')).toEqual({ levels: emptyLevels(), history: {} });
  });

  it('round-trips levels + history', async () => {
    const store = new CapacityStore(new InMemoryStore());
    const data = { levels: { ...emptyLevels(), hydration: 24, focus: 12 }, history: { '2026-06-14': 14 } };
    await store.save('u1', data);
    expect(await store.load('u1')).toEqual(data);
  });
});
