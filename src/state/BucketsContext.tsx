import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useGame } from '@/state/GameContext';
import { useSettings } from '@/state/SettingsContext';
import { bucketStore } from '@/services/buckets';
import { metadataStore } from '@/services/metadata';
import { APP_VERSION } from '@/content/aboutInfo';
import {
  assignActivity as assignActivityPure,
  bucketCounts,
  bucketForActivity,
  createBucket as createBucketPure,
  deleteBucket as deleteBucketPure,
  EMPTY_BUCKET_STATE,
  moveBucket as moveBucketPure,
  reorderBuckets as reorderBucketsPure,
  renameBucket as renameBucketPure,
  sortedBuckets,
  updateBucketStyle as updateBucketStylePure,
  type BucketColorId,
  type BucketState,
  type HabitBucket,
} from '@/lib/buckets';
import {
  buildContributionEvent,
  buildProvenanceEvent,
  type ContributionInput,
} from '@/lib/metadata';

interface CreateInput {
  name: string;
  iconId: string;
  colorId: BucketColorId;
  sourceActivityIds?: string[];
}

interface BucketsContextValue {
  ready: boolean;
  buckets: HabitBucket[];
  assignments: Record<string, string>;
  counts: Record<string, number>;
  createBucket: (input: CreateInput) => Promise<HabitBucket | null>;
  renameBucket: (id: string, name: string) => Promise<void>;
  restyleBucket: (id: string, style: { iconId?: string; colorId?: BucketColorId }) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  moveBucket: (id: string, delta: number) => Promise<void>;
  reorderBuckets: (orderedIds: string[]) => Promise<void>;
  assignActivity: (activityId: string, bucketId: string | null) => Promise<void>;
  bucketIdFor: (activityId: string) => string | undefined;
  /** Record a contribution event when a filed activity is completed (privacy-gated). */
  recordContribution: (activity: { id: string; category?: string; difficulty?: string; xp?: number }) => Promise<void>;
}

const BucketsContext = createContext<BucketsContextValue | null>(null);

export function BucketsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const { settings } = useSettings();
  const uid = user?.uid ?? null;

  const [state, setState] = useState<BucketState>(EMPTY_BUCKET_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setState(EMPTY_BUCKET_STATE);
      setReady(false);
      return;
    }
    bucketStore.load(uid).then((loaded) => {
      if (active) {
        setState(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  // Persist + update local state in one place.
  const commit = useCallback(
    async (next: BucketState): Promise<void> => {
      setState(next);
      if (uid) await bucketStore.save(uid, next);
    },
    [uid],
  );

  const appendEvent = useCallback(
    async (event: ReturnType<typeof buildProvenanceEvent> | ReturnType<typeof buildContributionEvent>) => {
      if (uid && event) await metadataStore.append(uid, event);
    },
    [uid],
  );

  const createBucket = useCallback(
    async (input: CreateInput): Promise<HabitBucket | null> => {
      if (!uid) return null;
      const { state: next, bucket } = createBucketPure(state, {
        name: input.name,
        iconId: input.iconId,
        colorId: input.colorId,
      });
      await commit(next);
      await appendEvent(
        buildProvenanceEvent(
          {
            bucketId: bucket.id,
            action: 'created',
            bucketName: bucket.name,
            iconId: bucket.iconId,
            colorId: bucket.colorId,
            sourceActivityIds: input.sourceActivityIds,
          },
          settings.metadataPrivacy,
          { now: Date.now(), appVersion: APP_VERSION },
        ),
      );
      return bucket;
    },
    [uid, state, commit, appendEvent, settings.metadataPrivacy],
  );

  const recordConfigured = useCallback(
    async (bucket: HabitBucket) => {
      await appendEvent(
        buildProvenanceEvent(
          {
            bucketId: bucket.id,
            action: 'configured',
            bucketName: bucket.name,
            iconId: bucket.iconId,
            colorId: bucket.colorId,
          },
          settings.metadataPrivacy,
          { now: Date.now(), appVersion: APP_VERSION },
        ),
      );
    },
    [appendEvent, settings.metadataPrivacy],
  );

  const renameBucket = useCallback(
    async (id: string, name: string) => {
      const next = renameBucketPure(state, id, name);
      await commit(next);
      const b = next.buckets.find((x) => x.id === id);
      if (b) await recordConfigured(b);
    },
    [state, commit, recordConfigured],
  );

  const restyleBucket = useCallback(
    async (id: string, style: { iconId?: string; colorId?: BucketColorId }) => {
      const next = updateBucketStylePure(state, id, style);
      await commit(next);
      const b = next.buckets.find((x) => x.id === id);
      if (b) await recordConfigured(b);
    },
    [state, commit, recordConfigured],
  );

  const deleteBucket = useCallback(
    async (id: string) => {
      await commit(deleteBucketPure(state, id));
    },
    [state, commit],
  );

  const moveBucket = useCallback(
    async (id: string, delta: number) => {
      await commit(moveBucketPure(state, id, delta));
    },
    [state, commit],
  );

  const reorderBuckets = useCallback(
    async (orderedIds: string[]) => {
      await commit(reorderBucketsPure(state, orderedIds));
    },
    [state, commit],
  );

  const assignActivity = useCallback(
    async (activityId: string, bucketId: string | null) => {
      await commit(assignActivityPure(state, activityId, bucketId));
    },
    [state, commit],
  );

  const bucketIdFor = useCallback((activityId: string) => bucketForActivity(state, activityId), [state]);

  const recordContribution = useCallback(
    async (activity: { id: string; category?: string; difficulty?: string; xp?: number }) => {
      if (!uid) return;
      const bucketId = bucketForActivity(state, activity.id);
      if (!bucketId) return;
      const input: ContributionInput = {
        activityId: activity.id,
        bucketId,
        context: { category: activity.category, difficulty: activity.difficulty, xp: activity.xp },
      };
      await appendEvent(
        buildContributionEvent(input, settings.metadataPrivacy, {
          now: Date.now(),
          appVersion: APP_VERSION,
        }),
      );
    },
    [uid, state, appendEvent, settings.metadataPrivacy],
  );

  const value = useMemo<BucketsContextValue>(
    () => ({
      ready,
      buckets: sortedBuckets(state),
      assignments: state.assignments,
      counts: bucketCounts(state),
      createBucket,
      renameBucket,
      restyleBucket,
      deleteBucket,
      moveBucket,
      reorderBuckets,
      assignActivity,
      bucketIdFor,
      recordContribution,
    }),
    [
      ready,
      state,
      createBucket,
      renameBucket,
      restyleBucket,
      deleteBucket,
      moveBucket,
      reorderBuckets,
      assignActivity,
      bucketIdFor,
      recordContribution,
    ],
  );

  return <BucketsContext.Provider value={value}>{children}</BucketsContext.Provider>;
}

export function useBuckets(): BucketsContextValue {
  const ctx = useContext(BucketsContext);
  if (!ctx) throw new Error('useBuckets must be used within a BucketsProvider');
  return ctx;
}
