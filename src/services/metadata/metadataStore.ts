/**
 * Local, append-only store for habit-formation metadata events. On-device only
 * (KeyValueStore seam); Firebase stays stubbed. The persisted shape maps to a
 * future Firebase subcollection users/{uid}/metadataEvents/{event.id}.
 *
 * A soft cap keeps storage bounded — oldest events are trimmed first. Long-term
 * analytics no longer depend on this raw log: daily roll-ups (rollupStore)
 * durably snapshot trends, so this cap only bounds the recent, detailed history.
 */
import type { KeyValueStore } from '@/services/storage';
import type { MetadataEvent } from '@/lib/metadata';

export const METADATA_SCHEMA_VERSION = 1;
export const MAX_METADATA_EVENTS = 4000;

const NS = 'levellio';
const metadataKey = (uid: string) => `${NS}:metadata:${uid}`;

function isEvent(value: unknown): value is MetadataEvent {
  const e = value as Partial<MetadataEvent>;
  return (
    !!e &&
    typeof e.id === 'string' &&
    (e.type === 'habit_provenance' || e.type === 'activity_contribution' || e.type === 'activity_session') &&
    typeof e.createdAt === 'number'
  );
}

export function normalizeEvents(raw: unknown): MetadataEvent[] {
  const events = (raw as { events?: unknown })?.events;
  if (!Array.isArray(events)) return [];
  return events.filter(isEvent);
}

export class MetadataStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<MetadataEvent[]> {
    const raw = await this.store.getItem(metadataKey(uid));
    if (!raw) return [];
    try {
      return normalizeEvents(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async append(uid: string, event: MetadataEvent): Promise<MetadataEvent[]> {
    const existing = await this.load(uid);
    const next = [...existing, event].slice(-MAX_METADATA_EVENTS);
    await this.persist(uid, next);
    return next;
  }

  async clear(uid: string): Promise<void> {
    await this.persist(uid, []);
  }

  private async persist(uid: string, events: MetadataEvent[]): Promise<void> {
    await this.store.setItem(
      metadataKey(uid),
      JSON.stringify({ schema: METADATA_SCHEMA_VERSION, events }),
    );
  }
}
