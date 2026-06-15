/**
 * One-time migration that collapses duplicate quests (same canonical key) into a
 * single survivor and repoints the per-day Plan and bucket assignments onto it.
 * Idempotent: guarded by a stored flag so it runs at most once per user. The
 * core function takes injected stores for testability; `migrateDuplicatesOnce`
 * wires the real app singletons.
 */
import { AsyncStorageStore, type KeyValueStore } from '@/services/storage';
import { dedupeQuests } from '@/lib/questForm';
import { repointAssignments, repointPlanDays } from '@/lib/dedupeMigration';
import { planStore, type PlanStore } from '@/services/plan';
import { bucketStore, type BucketStore } from '@/services/buckets';
import type { Quest } from '@/types';

const NS = 'levellio';
const flagKey = (uid: string) => `${NS}:dedupe-migrated:${uid}`;

export interface DedupeDeps {
  uid: string;
  store: KeyValueStore;
  planStore: PlanStore;
  bucketStore: BucketStore;
  loadQuests: () => Promise<Quest[]>;
  saveQuests: (quests: Quest[]) => Promise<void>;
}

export interface DedupeResult {
  /** How many duplicate quests were merged away. */
  merged: number;
  /** False when the guard flag was already set (skipped). */
  ran: boolean;
  /** The effective quest list to use afterwards (deduped when it ran). */
  quests: Quest[];
}

/** Core runner (testable). Merges dupes, repoints Plan + Buckets, sets the flag. */
export async function runDedupeMigration(deps: DedupeDeps): Promise<DedupeResult> {
  const quests = await deps.loadQuests();
  const already = await deps.store.getItem(flagKey(deps.uid));
  if (already) return { merged: 0, ran: false, quests };

  const { quests: deduped, remap } = dedupeQuests(quests);
  const merged = quests.length - deduped.length;

  if (merged > 0) {
    await deps.saveQuests(deduped);
    const plan = await deps.planStore.load(deps.uid);
    await deps.planStore.save(deps.uid, { days: repointPlanDays(plan.days, remap) });
    const buckets = await deps.bucketStore.load(deps.uid);
    await deps.bucketStore.save(deps.uid, {
      buckets: buckets.buckets,
      assignments: repointAssignments(buckets.assignments, remap),
    });
  }

  await deps.store.setItem(flagKey(deps.uid), '1');
  return { merged, ran: true, quests: deduped };
}

// App-wired flag store (mirrors the per-domain AsyncStorage singletons).
const flagStore = new AsyncStorageStore();

/** App entry point: run the dedupe once for a user, using the real stores. */
export function migrateDuplicatesOnce(
  uid: string,
  loadQuests: () => Promise<Quest[]>,
  saveQuests: (quests: Quest[]) => Promise<void>,
): Promise<DedupeResult> {
  return runDedupeMigration({ uid, store: flagStore, planStore, bucketStore, loadQuests, saveQuests });
}
