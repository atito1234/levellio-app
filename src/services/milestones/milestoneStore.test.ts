import { MilestoneStore, normalizeMilestones, MAX_MILESTONES } from './milestoneStore';
import { InMemoryStore } from '@/services/storage/InMemoryStore';
import type { Milestone } from '@/lib/milestones';

const m = (id: string): Milestone => ({ id, kind: 'streak', label: id, earnedAt: 1 });

describe('normalizeMilestones', () => {
  it('keeps only well-formed milestones', () => {
    const out = normalizeMilestones({
      earned: [m('streak-7'), { id: 'x' }, null, { id: 'y', kind: 'bogus', label: 'l', earnedAt: 1 }],
    });
    expect(out.map((x) => x.id)).toEqual(['streak-7']);
  });

  it('returns [] for malformed input', () => {
    expect(normalizeMilestones(null)).toEqual([]);
    expect(normalizeMilestones({ earned: 3 })).toEqual([]);
  });
});

describe('MilestoneStore', () => {
  it('round-trips earned milestones', async () => {
    const store = new MilestoneStore(new InMemoryStore());
    await store.save('u1', [m('streak-3'), m('streak-7')]);
    expect((await store.load('u1')).map((x) => x.id)).toEqual(['streak-3', 'streak-7']);
  });

  it('bounds stored milestones, keeping the most recent', async () => {
    const store = new MilestoneStore(new InMemoryStore());
    const many = Array.from({ length: MAX_MILESTONES + 3 }, (_, i) => m(`s${i}`));
    await store.save('u1', many);
    const out = await store.load('u1');
    expect(out).toHaveLength(MAX_MILESTONES);
    expect(out[out.length - 1]!.id).toBe(`s${MAX_MILESTONES + 2}`);
  });
});
