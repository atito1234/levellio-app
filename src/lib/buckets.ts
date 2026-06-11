/**
 * Habit "buckets" — user-managed groupings of activities (quests). Pure data +
 * pure helpers only (no I/O), so the model is fully unit-testable and maps
 * cleanly onto a future Firebase collection: users/{uid}/buckets/{bucketId}
 * plus an activity->bucket assignment map.
 */
import { colors } from '@/theme';

/** Bucket accent colors, drawn from the locked palette (+ tasteful extensions). */
export type BucketColorId = 'violet' | 'teal' | 'gold' | 'rose' | 'sky' | 'lime' | 'slate';

export interface BucketColor {
  id: BucketColorId;
  /** Strong accent (icon tint / card edge). */
  accent: string;
  /** Soft background tint for cards/chips. */
  soft: string;
}

export const BUCKET_COLORS: readonly BucketColor[] = [
  { id: 'violet', accent: colors.identity, soft: '#EDE9FE' },
  { id: 'teal', accent: colors.teal, soft: '#D6F7EF' },
  { id: 'gold', accent: colors.gold, soft: '#FFEBCC' },
  { id: 'rose', accent: '#D9457E', soft: '#FCE3EE' },
  { id: 'sky', accent: '#2E8BD6', soft: '#DCEEFB' },
  { id: 'lime', accent: '#5C9A1B', soft: '#E6F4D6' },
  { id: 'slate', accent: '#5A5A72', soft: '#ECECF2' },
];

export const DEFAULT_BUCKET_COLOR_ID: BucketColorId = 'violet';

export function getBucketColor(id: string): BucketColor {
  return BUCKET_COLORS.find((c) => c.id === id) ?? BUCKET_COLORS[0]!;
}

export interface HabitBucket {
  id: string;
  name: string;
  iconId: string;
  colorId: BucketColorId;
  /** Epoch ms. */
  createdAt: number;
  /** Sort order (ascending); contiguous within a state after normalization. */
  order: number;
}

export interface BucketState {
  buckets: HabitBucket[];
  /** activityId -> bucketId. Unfiled activities are simply absent. */
  assignments: Record<string, string>;
}

export const EMPTY_BUCKET_STATE: BucketState = { buckets: [], assignments: {} };

export const MAX_BUCKET_NAME = 40;

export interface NameValidation {
  valid: boolean;
  error?: string;
}

/** Validate a bucket name (non-empty, within length, not a duplicate). */
export function validateBucketName(
  name: string,
  state: BucketState,
  ignoreId?: string,
): NameValidation {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Give your bucket a name.' };
  if (trimmed.length > MAX_BUCKET_NAME) return { valid: false, error: `Keep it under ${MAX_BUCKET_NAME} characters.` };
  const clash = state.buckets.some(
    (b) => b.id !== ignoreId && b.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (clash) return { valid: false, error: 'You already have a bucket with that name.' };
  return { valid: true };
}

let bucketSeq = 0;
/** Deterministic-enough id for a new bucket. */
export function genBucketId(now: number = Date.now()): string {
  bucketSeq += 1;
  return `bucket-${now}-${bucketSeq}`;
}

/** Buckets sorted by their `order`. */
export function sortedBuckets(state: BucketState): HabitBucket[] {
  return [...state.buckets].sort((a, b) => a.order - b.order);
}

/** Re-number orders to a contiguous 0..n-1 in current sorted order. */
function renumber(buckets: HabitBucket[]): HabitBucket[] {
  return [...buckets]
    .sort((a, b) => a.order - b.order)
    .map((b, i) => (b.order === i ? b : { ...b, order: i }));
}

export interface CreateBucketInput {
  name: string;
  iconId: string;
  colorId: BucketColorId;
  now?: number;
}

/** Append a new bucket at the end. Returns the new state and the bucket. */
export function createBucket(
  state: BucketState,
  input: CreateBucketInput,
): { state: BucketState; bucket: HabitBucket } {
  const now = input.now ?? Date.now();
  const bucket: HabitBucket = {
    id: genBucketId(now),
    name: input.name.trim(),
    iconId: input.iconId,
    colorId: input.colorId,
    createdAt: now,
    order: state.buckets.length,
  };
  return { state: { ...state, buckets: [...state.buckets, bucket] }, bucket };
}

export function renameBucket(state: BucketState, id: string, name: string): BucketState {
  return {
    ...state,
    buckets: state.buckets.map((b) => (b.id === id ? { ...b, name: name.trim() } : b)),
  };
}

export function updateBucketStyle(
  state: BucketState,
  id: string,
  style: { iconId?: string; colorId?: BucketColorId },
): BucketState {
  return {
    ...state,
    buckets: state.buckets.map((b) =>
      b.id === id
        ? { ...b, ...(style.iconId ? { iconId: style.iconId } : {}), ...(style.colorId ? { colorId: style.colorId } : {}) }
        : b,
    ),
  };
}

/** Delete a bucket and unfile any activities that were in it. */
export function deleteBucket(state: BucketState, id: string): BucketState {
  const assignments: Record<string, string> = {};
  for (const [activityId, bucketId] of Object.entries(state.assignments)) {
    if (bucketId !== id) assignments[activityId] = bucketId;
  }
  return { buckets: renumber(state.buckets.filter((b) => b.id !== id)), assignments };
}

/** Move a bucket up/down by `delta` positions (accessible reordering). */
export function moveBucket(state: BucketState, id: string, delta: number): BucketState {
  const ordered = sortedBuckets(state);
  const index = ordered.findIndex((b) => b.id === id);
  if (index < 0) return state;
  const target = Math.max(0, Math.min(ordered.length - 1, index + delta));
  if (target === index) return state;
  const [moved] = ordered.splice(index, 1);
  ordered.splice(target, 0, moved!);
  return { ...state, buckets: ordered.map((b, i) => ({ ...b, order: i })) };
}

/** Reorder to an explicit id order (used by drag-and-drop drop result). */
export function reorderBuckets(state: BucketState, orderedIds: string[]): BucketState {
  const byId = new Map(state.buckets.map((b) => [b.id, b]));
  const next: HabitBucket[] = [];
  orderedIds.forEach((bid, i) => {
    const b = byId.get(bid);
    if (b) {
      next.push({ ...b, order: i });
      byId.delete(bid);
    }
  });
  // Any buckets not listed keep following, renumbered.
  for (const b of byId.values()) next.push({ ...b, order: next.length });
  return { ...state, buckets: next };
}

/** File an activity into a bucket, or pass null/undefined to unfile it. */
export function assignActivity(
  state: BucketState,
  activityId: string,
  bucketId: string | null,
): BucketState {
  const assignments = { ...state.assignments };
  if (!bucketId || !state.buckets.some((b) => b.id === bucketId)) {
    delete assignments[activityId];
  } else {
    assignments[activityId] = bucketId;
  }
  return { ...state, assignments };
}

/** The bucket id an activity is filed in, or undefined when unfiled. */
export function bucketForActivity(state: BucketState, activityId: string): string | undefined {
  return state.assignments[activityId];
}

/** Activity ids filed in a given bucket. */
export function activitiesInBucket(state: BucketState, bucketId: string): string[] {
  return Object.entries(state.assignments)
    .filter(([, bid]) => bid === bucketId)
    .map(([activityId]) => activityId);
}

/** Count of activities per bucket id. */
export function bucketCounts(state: BucketState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const bid of Object.values(state.assignments)) counts[bid] = (counts[bid] ?? 0) + 1;
  return counts;
}
