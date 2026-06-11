/**
 * Habit-formation metadata — pure event model + per-field privacy gating.
 *
 * Two event kinds are captured locally over time (no network; Firebase stubbed):
 *  - habit_provenance: what led to a bucket/habit being created or configured.
 *  - activity_contribution: an activity (filed in a bucket) being completed.
 *
 * Every richer field is governed by a per-field opt-in toggle, defaulting to a
 * privacy-preserving minimum. Builders return `null` when a category is opted
 * out, so callers never store something the user disabled.
 *
 * Firebase mapping (future): each event -> a document in
 * users/{uid}/metadataEvents/{event.id}, discriminated by `type`.
 */

export type MetadataEventType = 'habit_provenance' | 'activity_contribution';

interface BaseEvent {
  id: string;
  type: MetadataEventType;
  /** Epoch ms (coarsened to local midnight when timestamps are opted out). */
  createdAt: number;
  /** App version that produced the event (for schema evolution). */
  appVersion: string;
}

export interface HabitProvenanceEvent extends BaseEvent {
  type: 'habit_provenance';
  bucketId: string;
  /** "created" when the bucket is made, "configured" when icon/color/name change. */
  action: 'created' | 'configured';
  bucketName?: string;
  iconId?: string;
  colorId?: string;
  /** Activities the user had selected/were in scope when forming the habit. */
  sourceActivityIds?: string[];
}

export interface ActivityContributionEvent extends BaseEvent {
  type: 'activity_contribution';
  activityId: string;
  bucketId: string;
  /** Optional richer context (off by default). */
  context?: { category?: string; difficulty?: string; xp?: number };
}

export type MetadataEvent = HabitProvenanceEvent | ActivityContributionEvent;

/** Per-field opt-in toggles. Defaults are privacy-preserving. */
export interface MetadataPrivacy {
  /** Master switch for provenance capture (local only). */
  recordProvenance: boolean;
  /** Master switch for contribution capture (local only). */
  recordContribution: boolean;
  /** Include the bucket name on events. */
  includeBucketName: boolean;
  /** Include which source activities led to a habit. */
  includeSourceActivities: boolean;
  /** Include activity context (category/difficulty/xp) on contributions. */
  includeContext: boolean;
  /** Keep exact timestamps; when off, timestamps are coarsened to the day. */
  includeTimestamps: boolean;
}

export const DEFAULT_METADATA_PRIVACY: MetadataPrivacy = {
  recordProvenance: true,
  recordContribution: true,
  includeBucketName: true,
  includeSourceActivities: false,
  includeContext: false,
  includeTimestamps: true,
};

/** Coerce arbitrary stored data into a valid privacy object. */
export function normalizeMetadataPrivacy(raw: unknown): MetadataPrivacy {
  const r = (raw ?? {}) as Partial<MetadataPrivacy>;
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  return {
    recordProvenance: bool(r.recordProvenance, DEFAULT_METADATA_PRIVACY.recordProvenance),
    recordContribution: bool(r.recordContribution, DEFAULT_METADATA_PRIVACY.recordContribution),
    includeBucketName: bool(r.includeBucketName, DEFAULT_METADATA_PRIVACY.includeBucketName),
    includeSourceActivities: bool(r.includeSourceActivities, DEFAULT_METADATA_PRIVACY.includeSourceActivities),
    includeContext: bool(r.includeContext, DEFAULT_METADATA_PRIVACY.includeContext),
    includeTimestamps: bool(r.includeTimestamps, DEFAULT_METADATA_PRIVACY.includeTimestamps),
  };
}

let eventSeq = 0;
function genEventId(now: number): string {
  eventSeq += 1;
  return `evt-${now}-${eventSeq}`;
}

/** Local midnight (ms) for a given time — used when exact timestamps are off. */
function coarsenToDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function stamp(now: number, privacy: MetadataPrivacy): number {
  return privacy.includeTimestamps ? now : coarsenToDay(now);
}

export interface ProvenanceInput {
  bucketId: string;
  action: 'created' | 'configured';
  bucketName: string;
  iconId: string;
  colorId: string;
  sourceActivityIds?: string[];
}

export interface ContributionInput {
  activityId: string;
  bucketId: string;
  context?: { category?: string; difficulty?: string; xp?: number };
}

export interface BuildDeps {
  now: number;
  appVersion: string;
}

/** Build a privacy-filtered provenance event, or null if opted out. */
export function buildProvenanceEvent(
  input: ProvenanceInput,
  privacy: MetadataPrivacy,
  deps: BuildDeps,
): HabitProvenanceEvent | null {
  if (!privacy.recordProvenance) return null;
  return {
    id: genEventId(deps.now),
    type: 'habit_provenance',
    createdAt: stamp(deps.now, privacy),
    appVersion: deps.appVersion,
    bucketId: input.bucketId,
    action: input.action,
    ...(privacy.includeBucketName ? { bucketName: input.bucketName } : {}),
    iconId: input.iconId,
    colorId: input.colorId,
    ...(privacy.includeSourceActivities && input.sourceActivityIds
      ? { sourceActivityIds: input.sourceActivityIds }
      : {}),
  };
}

/** Build a privacy-filtered contribution event, or null if opted out. */
export function buildContributionEvent(
  input: ContributionInput,
  privacy: MetadataPrivacy,
  deps: BuildDeps,
): ActivityContributionEvent | null {
  if (!privacy.recordContribution) return null;
  return {
    id: genEventId(deps.now),
    type: 'activity_contribution',
    createdAt: stamp(deps.now, privacy),
    appVersion: deps.appVersion,
    activityId: input.activityId,
    bucketId: input.bucketId,
    ...(privacy.includeContext && input.context ? { context: input.context } : {}),
  };
}
