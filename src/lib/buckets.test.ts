import {
  activitiesInBucket,
  assignActivity,
  bucketCounts,
  bucketForActivity,
  createBucket,
  deleteBucket,
  EMPTY_BUCKET_STATE,
  getBucketColor,
  moveBucket,
  renameBucket,
  reorderBuckets,
  sortedBuckets,
  updateBucketStyle,
  validateBucketName,
  type BucketState,
} from './buckets';

function seed(): BucketState {
  let s: BucketState = EMPTY_BUCKET_STATE;
  s = createBucket(s, { name: 'Health', iconId: 'heart', colorId: 'teal', now: 1 }).state;
  s = createBucket(s, { name: 'Work', iconId: 'briefcase', colorId: 'violet', now: 2 }).state;
  s = createBucket(s, { name: 'Mind', iconId: 'bulb', colorId: 'gold', now: 3 }).state;
  return s;
}

describe('bucket creation + ordering', () => {
  it('appends buckets with contiguous order', () => {
    const s = seed();
    expect(s.buckets).toHaveLength(3);
    expect(sortedBuckets(s).map((b) => b.order)).toEqual([0, 1, 2]);
    expect(sortedBuckets(s).map((b) => b.name)).toEqual(['Health', 'Work', 'Mind']);
  });

  it('renames and restyles a bucket', () => {
    let s = seed();
    const id = s.buckets[0]!.id;
    s = renameBucket(s, id, '  Wellness ');
    s = updateBucketStyle(s, id, { iconId: 'leaf', colorId: 'lime' });
    const b = s.buckets.find((x) => x.id === id)!;
    expect(b.name).toBe('Wellness');
    expect(b.iconId).toBe('leaf');
    expect(b.colorId).toBe('lime');
  });

  it('moves a bucket up/down and reorders by ids', () => {
    let s = seed();
    const ids = sortedBuckets(s).map((b) => b.id);
    s = moveBucket(s, ids[2]!, -1); // Mind up one
    expect(sortedBuckets(s).map((b) => b.name)).toEqual(['Health', 'Mind', 'Work']);
    s = reorderBuckets(s, [ids[2]!, ids[0]!, ids[1]!]);
    expect(sortedBuckets(s).map((b) => b.id)).toEqual([ids[2], ids[0], ids[1]]);
  });

  it('clamps moves at the ends', () => {
    const s = seed();
    const first = sortedBuckets(s)[0]!.id;
    expect(moveBucket(s, first, -1)).toEqual(s);
  });
});

describe('bucket name validation', () => {
  it('rejects empty, too-long, and duplicate names', () => {
    const s = seed();
    expect(validateBucketName('   ', s).valid).toBe(false);
    expect(validateBucketName('x'.repeat(41), s).valid).toBe(false);
    expect(validateBucketName('work', s).valid).toBe(false); // dup (case-insensitive)
    expect(validateBucketName('Travel', s).valid).toBe(true);
  });

  it('allows keeping a name when editing the same bucket', () => {
    const s = seed();
    const id = s.buckets[1]!.id;
    expect(validateBucketName('Work', s, id).valid).toBe(true);
  });
});

describe('activity assignment', () => {
  it('files and unfiles activities', () => {
    let s = seed();
    const health = s.buckets[0]!.id;
    s = assignActivity(s, 'q1', health);
    expect(bucketForActivity(s, 'q1')).toBe(health);
    expect(activitiesInBucket(s, health)).toEqual(['q1']);
    s = assignActivity(s, 'q1', null);
    expect(bucketForActivity(s, 'q1')).toBeUndefined();
  });

  it('ignores assignment to a non-existent bucket', () => {
    let s = seed();
    s = assignActivity(s, 'q1', 'bucket-nope');
    expect(bucketForActivity(s, 'q1')).toBeUndefined();
  });

  it('counts activities per bucket', () => {
    let s = seed();
    const [a, b] = [s.buckets[0]!.id, s.buckets[1]!.id];
    s = assignActivity(s, 'q1', a);
    s = assignActivity(s, 'q2', a);
    s = assignActivity(s, 'q3', b);
    expect(bucketCounts(s)).toEqual({ [a]: 2, [b]: 1 });
  });

  it('unfiles activities when their bucket is deleted, renumbering order', () => {
    let s = seed();
    const mind = sortedBuckets(s)[2]!.id;
    const health = sortedBuckets(s)[0]!.id;
    s = assignActivity(s, 'q1', mind);
    s = assignActivity(s, 'q2', health);
    s = deleteBucket(s, mind);
    expect(s.buckets).toHaveLength(2);
    expect(sortedBuckets(s).map((b) => b.order)).toEqual([0, 1]);
    expect(bucketForActivity(s, 'q1')).toBeUndefined();
    expect(bucketForActivity(s, 'q2')).toBe(health);
  });
});

describe('bucket colors', () => {
  it('resolves palette colors and falls back', () => {
    expect(getBucketColor('teal').accent).toMatch(/^#/);
    expect(getBucketColor('nope').id).toBe('violet');
  });
});
