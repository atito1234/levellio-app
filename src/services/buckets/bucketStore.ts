/**
 * Local persistence for habit buckets + activity assignments. Uses the shared
 * KeyValueStore seam (AsyncStorage in the app, in-memory in tests). The stored
 * shape mirrors a future Firebase document so it can migrate cleanly:
 *
 *   users/{uid}/buckets            -> { buckets: HabitBucket[] }
 *   users/{uid}/assignments        -> { [activityId]: bucketId }
 *
 * Firebase stays STUBBED — this is on-device only, no network.
 */
import type { KeyValueStore } from '@/services/storage';
import {
  BUCKET_COLORS,
  EMPTY_BUCKET_STATE,
  type BucketColorId,
  type BucketState,
  type HabitBucket,
} from '@/lib/buckets';
import { isValidBucketIconId } from '@/data/bucketIcons';

export const BUCKET_SCHEMA_VERSION = 1;

const NS = 'levellio';
const bucketsKey = (uid: string) => `${NS}:buckets:${uid}`;

const COLOR_IDS = new Set(BUCKET_COLORS.map((c) => c.id));

function isColorId(v: unknown): v is BucketColorId {
  return typeof v === 'string' && COLOR_IDS.has(v as BucketColorId);
}

/** Coerce an unknown persisted blob into a valid, self-consistent BucketState. */
export function normalizeBucketState(raw: unknown): BucketState {
  const r = (raw ?? {}) as { buckets?: unknown; assignments?: unknown };
  const buckets: HabitBucket[] = Array.isArray(r.buckets)
    ? r.buckets
        .map((item, i): HabitBucket | null => {
          const b = (item ?? {}) as Partial<HabitBucket>;
          if (typeof b.id !== 'string' || typeof b.name !== 'string') return null;
          return {
            id: b.id,
            name: b.name,
            iconId: typeof b.iconId === 'string' && isValidBucketIconId(b.iconId) ? b.iconId : 'target',
            colorId: isColorId(b.colorId) ? b.colorId : 'violet',
            createdAt: typeof b.createdAt === 'number' && Number.isFinite(b.createdAt) ? b.createdAt : 0,
            order: typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : i,
          };
        })
        .filter((b): b is HabitBucket => b !== null)
    : [];

  // Renumber to contiguous order and drop duplicate ids.
  const seen = new Set<string>();
  const deduped = buckets
    .sort((a, b) => a.order - b.order)
    .filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)))
    .map((b, i) => ({ ...b, order: i }));
  const validIds = new Set(deduped.map((b) => b.id));

  const assignments: Record<string, string> = {};
  const rawAssignments = (r.assignments ?? {}) as Record<string, unknown>;
  for (const [activityId, bucketId] of Object.entries(rawAssignments)) {
    if (typeof bucketId === 'string' && validIds.has(bucketId)) assignments[activityId] = bucketId;
  }

  return { buckets: deduped, assignments };
}

export class BucketStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<BucketState> {
    const raw = await this.store.getItem(bucketsKey(uid));
    if (!raw) return { ...EMPTY_BUCKET_STATE, buckets: [], assignments: {} };
    try {
      return normalizeBucketState(JSON.parse(raw));
    } catch {
      return { buckets: [], assignments: {} };
    }
  }

  async save(uid: string, state: BucketState): Promise<void> {
    const payload = {
      schema: BUCKET_SCHEMA_VERSION,
      buckets: state.buckets,
      assignments: state.assignments,
    };
    await this.store.setItem(bucketsKey(uid), JSON.stringify(payload));
  }
}
