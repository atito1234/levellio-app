import { RollupStore, normalizeRollup, normalizeRollups, trimRollups, MAX_ROLLUP_DAYS } from './rollupStore';
import { InMemoryStore } from '@/services/storage/InMemoryStore';
import type { DailyRollup } from '@/lib/metrics/rollup';

function rollup(dayKey: string): DailyRollup {
  return {
    dayKey,
    perCategoryMin: { fitness: 30 },
    perCategoryDone: { fitness: 2 },
    capacityPoints: { endurance: 6 },
    sessions: 2,
    ratingAvg: 4,
  };
}

describe('normalizeRollup', () => {
  it('drops junk fields and tolerates partial data', () => {
    const r = normalizeRollup('2026-06-15', {
      perCategoryMin: { fitness: 30, bad: 'x' },
      capacityPoints: { endurance: 6 },
      sessions: 'nope',
    });
    expect(r).toEqual({
      dayKey: '2026-06-15',
      perCategoryMin: { fitness: 30 },
      perCategoryDone: {},
      capacityPoints: { endurance: 6 },
      sessions: 0,
    });
  });

  it('rejects invalid day keys and non-objects', () => {
    expect(normalizeRollup('not-a-day', rollup('2026-06-15'))).toBeNull();
    expect(normalizeRollup('2026-06-15', null)).toBeNull();
  });
});

describe('normalizeRollups', () => {
  it('keeps valid days and drops malformed ones', () => {
    const days = normalizeRollups({ days: { '2026-06-15': rollup('2026-06-15'), 'x': rollup('x') } });
    expect(Object.keys(days)).toEqual(['2026-06-15']);
  });

  it('returns empty for malformed input', () => {
    expect(normalizeRollups(null)).toEqual({});
    expect(normalizeRollups({ days: 42 })).toEqual({});
  });
});

describe('trimRollups', () => {
  it('keeps only the most recent N days', () => {
    const days: Record<string, DailyRollup> = {};
    for (let d = 1; d <= MAX_ROLLUP_DAYS + 5; d++) {
      const key = `2026-${`${Math.floor((d - 1) / 28) + 1}`.padStart(2, '0')}-${`${((d - 1) % 28) + 1}`.padStart(2, '0')}`;
      days[key] = rollup(key);
    }
    const trimmed = trimRollups(days);
    expect(Object.keys(trimmed)).toHaveLength(MAX_ROLLUP_DAYS);
  });
});

describe('RollupStore', () => {
  it('round-trips rollups', async () => {
    const store = new RollupStore(new InMemoryStore());
    await store.save('u1', { '2026-06-15': rollup('2026-06-15') });
    const loaded = await store.load('u1');
    expect(loaded['2026-06-15']).toEqual(rollup('2026-06-15'));
  });

  it('returns an empty map for unknown users', async () => {
    expect(await new RollupStore(new InMemoryStore()).load('nobody')).toEqual({});
  });

  it('survives corrupt stored JSON', async () => {
    const inner = new InMemoryStore();
    await inner.setItem('levellio:rollups:u1', '{not json');
    expect(await new RollupStore(inner).load('u1')).toEqual({});
  });
});
