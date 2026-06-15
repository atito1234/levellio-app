/**
 * Local persistence for the battle journal. On-device only (KeyValueStore seam);
 * Firebase stays stubbed. Media is stored as a device URI reference (not the
 * bytes), keeping storage small. Maps to a future users/{uid}/journal collection
 * that the community phase turns social.
 */
import type { KeyValueStore } from '@/services/storage';
import type { JournalAudience, JournalEntry, JournalFollowUp, JournalMedia, JournalMood } from '@/lib/journal';

export const JOURNAL_SCHEMA_VERSION = 1;
export const MAX_ENTRIES = 500;
export const MAX_FOLLOWUPS = 200;

const NS = 'levellio';
const journalKey = (uid: string) => `${NS}:journal:${uid}`;
const AUDIENCES = new Set<JournalAudience>(['private', 'circle', 'public']);
const MOODS = new Set<JournalMood>(['stuck', 'anxious', 'drained', 'resisting', 'hopeful', 'determined']);

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function normalizeMedia(raw: unknown): JournalMedia | undefined {
  const m = raw as Partial<JournalMedia> | undefined;
  if (!m || typeof m.uri !== 'string' || m.uri.length === 0) return undefined;
  return { uri: m.uri, type: m.type === 'video' ? 'video' : 'image' };
}

function normalizeFollowUp(raw: unknown): JournalFollowUp | null {
  const f = (raw ?? {}) as Partial<JournalFollowUp>;
  if (typeof f.id !== 'string' || typeof f.text !== 'string' || f.text.trim().length === 0) return null;
  return { id: f.id, text: f.text, createdAt: typeof f.createdAt === 'number' ? f.createdAt : 0 };
}

function normalizeEntry(raw: unknown): JournalEntry | null {
  const e = (raw ?? {}) as Partial<JournalEntry>;
  if (typeof e.id !== 'string') return null;
  const text = typeof e.text === 'string' ? e.text : '';
  const media = normalizeMedia(e.media);
  // An entry must carry some content.
  if (text.trim().length === 0 && !media) return null;
  return {
    id: e.id,
    createdAt: typeof e.createdAt === 'number' && Number.isFinite(e.createdAt) ? e.createdAt : 0,
    ...(str(e.dragonId) ? { dragonId: e.dragonId } : {}),
    ...(str(e.dragonName) ? { dragonName: e.dragonName } : {}),
    ...(Array.isArray(e.questIds) ? { questIds: e.questIds.filter((q): q is string => typeof q === 'string') } : {}),
    text,
    ...(e.mood && MOODS.has(e.mood) ? { mood: e.mood } : {}),
    audience: e.audience && AUDIENCES.has(e.audience) ? e.audience : 'private',
    ...(media ? { media } : {}),
    followUps: Array.isArray(e.followUps)
      ? e.followUps.map(normalizeFollowUp).filter((f): f is JournalFollowUp => f !== null).slice(0, MAX_FOLLOWUPS)
      : [],
  };
}

export function normalizeJournal(raw: unknown): JournalEntry[] {
  const arr = (raw as { entries?: unknown })?.entries;
  if (!Array.isArray(arr)) return [];
  return arr
    .map(normalizeEntry)
    .filter((e): e is JournalEntry => e !== null)
    .sort((a, b) => b.createdAt - a.createdAt) // newest first
    .slice(0, MAX_ENTRIES);
}

export class JournalStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<JournalEntry[]> {
    const raw = await this.store.getItem(journalKey(uid));
    if (!raw) return [];
    try {
      return normalizeJournal(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async save(uid: string, entries: JournalEntry[]): Promise<void> {
    await this.store.setItem(
      journalKey(uid),
      JSON.stringify({ schema: JOURNAL_SCHEMA_VERSION, entries: entries.slice(0, MAX_ENTRIES) }),
    );
  }
}
