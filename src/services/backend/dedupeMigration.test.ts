import { runDedupeMigration } from './dedupeMigration';
import { PlanStore } from '@/services/plan';
import { BucketStore } from '@/services/buckets';
import { InMemoryStore } from '@/services/storage/InMemoryStore';
import type { Quest } from '@/types';

const q = (id: string, title: string, over: Partial<Quest> = {}): Quest => ({
  id,
  title,
  category: 'fitness',
  difficulty: 'medium',
  baseXp: 40,
  completed: false,
  ...over,
});

function setup() {
  const flag = new InMemoryStore();
  const planStore = new PlanStore(new InMemoryStore());
  const bucketStore = new BucketStore(new InMemoryStore());
  let saved: Quest[] = [
    q('a', '20-minute workout'),
    q('b', '20-Minute Workout', { completed: true, lastCompletedDate: '2026-06-15' }),
    q('c', 'Go for a 5km run'),
  ];
  const deps = {
    uid: 'u1',
    store: flag,
    planStore,
    bucketStore,
    loadQuests: () => Promise.resolve(saved),
    saveQuests: (next: Quest[]) => {
      saved = next;
      return Promise.resolve();
    },
  };
  return { deps, planStore, bucketStore, getSaved: () => saved };
}

describe('runDedupeMigration', () => {
  it('merges duplicates and repoints plan + bucket assignments to survivors', async () => {
    const { deps, planStore, bucketStore } = setup();
    await planStore.save('u1', { days: { '2026-06-15': ['a', 'b', 'c'] } });
    await bucketStore.save('u1', {
      buckets: [{ id: 'bk', name: 'Fitness', iconId: 'target', colorId: 'violet', createdAt: 0, order: 0 }],
      assignments: { a: 'bk', c: 'bk' },
    });

    const res = await runDedupeMigration(deps);

    expect(res.ran).toBe(true);
    expect(res.merged).toBe(1); // a+b collapse
    expect(res.quests).toHaveLength(2);
    const survivor = res.quests.find((x) => x.title.toLowerCase() === '20-minute workout')!;
    expect(survivor.id).toBe('b'); // most recent completion wins

    const plan = await planStore.load('u1');
    expect(plan.days['2026-06-15']).toEqual(['b', 'c']); // a->b collapsed, de-duped

    const buckets = await bucketStore.load('u1');
    expect(buckets.assignments).toEqual({ b: 'bk', c: 'bk' }); // a repointed to b
  });

  it('is idempotent — a second run is skipped via the flag', async () => {
    const { deps } = setup();
    const first = await runDedupeMigration(deps);
    expect(first.ran).toBe(true);
    const second = await runDedupeMigration(deps);
    expect(second.ran).toBe(false);
    expect(second.merged).toBe(0);
    expect(second.quests).toHaveLength(2); // already deduped
  });
});
