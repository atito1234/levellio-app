import {
  BUCKET_ICONS,
  DEFAULT_BUCKET_ICON_ID,
  getBucketIcon,
  isValidBucketIconId,
} from './bucketIcons';

describe('bucket icon set', () => {
  it('offers a curated set of 16-24 icons', () => {
    expect(BUCKET_ICONS.length).toBeGreaterThanOrEqual(16);
    expect(BUCKET_ICONS.length).toBeLessThanOrEqual(24);
  });

  it('has unique ids and accessible names', () => {
    const ids = BUCKET_ICONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const icon of BUCKET_ICONS) {
      expect(icon.name.length).toBeGreaterThan(0);
      expect(icon.paths.length).toBeGreaterThan(0);
      for (const d of icon.paths) expect(d.length).toBeGreaterThan(0);
    }
  });

  it('exposes a valid default icon and lookup/validation', () => {
    expect(isValidBucketIconId(DEFAULT_BUCKET_ICON_ID)).toBe(true);
    expect(getBucketIcon(DEFAULT_BUCKET_ICON_ID).id).toBe(DEFAULT_BUCKET_ICON_ID);
    expect(getBucketIcon('does-not-exist').id).toBe(BUCKET_ICONS[0]!.id);
    expect(isValidBucketIconId('does-not-exist')).toBe(false);
  });
});
