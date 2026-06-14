import {
  buildContributionEvent,
  buildProvenanceEvent,
  buildSessionEvent,
  DEFAULT_METADATA_PRIVACY,
  normalizeMetadataPrivacy,
  type MetadataPrivacy,
} from './metadata';

const deps = { now: 1_700_000_000_000, appVersion: '1.0.0' };

const provInput = {
  bucketId: 'b1',
  action: 'created' as const,
  bucketName: 'Health',
  iconId: 'heart',
  colorId: 'teal',
  sourceActivityIds: ['q1', 'q2'],
};

const contribInput = {
  activityId: 'q1',
  bucketId: 'b1',
  context: { category: 'fitness', difficulty: 'medium', xp: 40 },
};

describe('privacy defaults', () => {
  it('are privacy-preserving (richer fields off)', () => {
    expect(DEFAULT_METADATA_PRIVACY.includeSourceActivities).toBe(false);
    expect(DEFAULT_METADATA_PRIVACY.includeContext).toBe(false);
    expect(DEFAULT_METADATA_PRIVACY.recordProvenance).toBe(true);
    expect(DEFAULT_METADATA_PRIVACY.recordContribution).toBe(true);
  });

  it('normalizes junk to defaults and keeps valid booleans', () => {
    expect(normalizeMetadataPrivacy(null)).toEqual(DEFAULT_METADATA_PRIVACY);
    expect(normalizeMetadataPrivacy({ includeContext: true }).includeContext).toBe(true);
    expect(normalizeMetadataPrivacy({ includeContext: 'yes' }).includeContext).toBe(false);
  });
});

describe('provenance events', () => {
  it('captures the core event but omits richer fields by default', () => {
    const e = buildProvenanceEvent(provInput, DEFAULT_METADATA_PRIVACY, deps)!;
    expect(e.type).toBe('habit_provenance');
    expect(e.bucketId).toBe('b1');
    expect(e.action).toBe('created');
    expect(e.bucketName).toBe('Health'); // included by default
    expect(e.sourceActivityIds).toBeUndefined(); // opted out by default
    expect(e.appVersion).toBe('1.0.0');
    expect(e.createdAt).toBe(deps.now);
  });

  it('includes source activities when opted in', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, includeSourceActivities: true };
    const e = buildProvenanceEvent(provInput, privacy, deps)!;
    expect(e.sourceActivityIds).toEqual(['q1', 'q2']);
  });

  it('omits the bucket name when opted out', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, includeBucketName: false };
    expect(buildProvenanceEvent(provInput, privacy, deps)!.bucketName).toBeUndefined();
  });

  it('returns null when provenance capture is disabled', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, recordProvenance: false };
    expect(buildProvenanceEvent(provInput, privacy, deps)).toBeNull();
  });

  it('coarsens timestamps to local midnight when timestamps are opted out', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, includeTimestamps: false };
    const e = buildProvenanceEvent(provInput, privacy, deps)!;
    const d = new Date(e.createdAt);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(e.createdAt).toBeLessThanOrEqual(deps.now);
  });
});

describe('contribution events', () => {
  it('links activity to bucket and omits context by default', () => {
    const e = buildContributionEvent(contribInput, DEFAULT_METADATA_PRIVACY, deps)!;
    expect(e.type).toBe('activity_contribution');
    expect(e.activityId).toBe('q1');
    expect(e.bucketId).toBe('b1');
    expect(e.context).toBeUndefined();
  });

  it('includes context when opted in', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, includeContext: true };
    const e = buildContributionEvent(contribInput, privacy, deps)!;
    expect(e.context).toEqual({ category: 'fitness', difficulty: 'medium', xp: 40 });
  });

  it('returns null when contribution capture is disabled', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, recordContribution: false };
    expect(buildContributionEvent(contribInput, privacy, deps)).toBeNull();
  });
});

describe('activity session events', () => {
  const sessionInput = {
    activityId: 'q1',
    category: 'fitness',
    method: 'timer' as const,
    durationSec: 1200,
    location: { lat: 1, lng: 2, speed: 3 },
  };

  it('captures duration/method + time-of-day by default, but not location', () => {
    const e = buildSessionEvent(sessionInput, DEFAULT_METADATA_PRIVACY, deps)!;
    expect(e.type).toBe('activity_session');
    expect(e.method).toBe('timer');
    expect(e.durationSec).toBe(1200);
    expect(typeof e.hourOfDay).toBe('number');
    expect(typeof e.weekday).toBe('number');
    expect(e.location).toBeUndefined(); // opted out by default
    expect(e.category).toBeUndefined(); // context off by default
  });

  it('includes location only when opted in', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, includeLocation: true };
    expect(buildSessionEvent(sessionInput, privacy, deps)!.location).toEqual({ lat: 1, lng: 2, speed: 3 });
  });

  it('omits time-of-day when timestamps are coarsened', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, includeTimestamps: false };
    const e = buildSessionEvent(sessionInput, privacy, deps)!;
    expect(e.hourOfDay).toBeUndefined();
    expect(e.weekday).toBeUndefined();
  });

  it('returns null when session capture is disabled', () => {
    const privacy: MetadataPrivacy = { ...DEFAULT_METADATA_PRIVACY, recordSession: false };
    expect(buildSessionEvent(sessionInput, privacy, deps)).toBeNull();
  });
});
