import { PlanStore, normalizeDays, trimDays, MAX_PLAN_DAYS } from './planStore';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

describe('normalizeDays', () => {
  it('keeps valid day-keys with string ids and drops junk', () => {
    const days = normalizeDays({
      days: {
        '2026-06-14': ['q1', 'q2', 'q2', 7, ''], // dupes/non-strings dropped
        'not-a-day': ['q9'],
        '2026-06-15': 'nope',
      },
    });
    expect(days['2026-06-14']).toEqual(['q1', 'q2']);
    expect(days['not-a-day']).toBeUndefined();
    expect(days['2026-06-15']).toBeUndefined();
  });

  it('returns empty map for malformed input', () => {
    expect(normalizeDays(null)).toEqual({});
    expect(normalizeDays({ days: 42 })).toEqual({});
  });
});

describe('trimDays', () => {
  it('keeps only the most recent N day-keys', () => {
    const days: Record<string, string[]> = {};
    for (let d = 1; d <= MAX_PLAN_DAYS + 5; d++) {
      days[`2026-01-${`${d}`.padStart(2, '0')}`] = ['q1'];
    }
    const trimmed = trimDays(days);
    expect(Object.keys(trimmed)).toHaveLength(MAX_PLAN_DAYS);
    expect(trimmed['2026-01-01']).toBeUndefined(); // oldest dropped
    expect(trimmed[`2026-01-${MAX_PLAN_DAYS + 5}`]).toEqual(['q1']); // newest kept
  });
});

describe('PlanStore', () => {
  it('round-trips a plan and bounds day growth on save', async () => {
    const store = new PlanStore(new InMemoryStore());
    await store.save('u1', { days: { '2026-06-14': ['q1', 'q3'] } });
    const data = await store.load('u1');
    expect(data.days['2026-06-14']).toEqual(['q1', 'q3']);
  });

  it('returns an empty plan for unknown users', async () => {
    const store = new PlanStore(new InMemoryStore());
    expect(await store.load('nobody')).toEqual({ days: {} });
  });
});
