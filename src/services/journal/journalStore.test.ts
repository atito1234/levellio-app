import { JournalStore, normalizeJournal, MAX_ENTRIES } from './journalStore';
import { InMemoryStore } from '@/services/storage/InMemoryStore';
import type { JournalEntry } from '@/lib/journal';

const entry = (id: string, over: Partial<JournalEntry> = {}): JournalEntry => ({
  id,
  createdAt: Number(id.replace(/\D/g, '')) || 1,
  text: `reflection ${id}`,
  audience: 'private',
  followUps: [],
  ...over,
});

describe('normalizeJournal', () => {
  it('keeps valid entries, sorted newest first', () => {
    const out = normalizeJournal({ entries: [entry('1'), entry('3'), entry('2')] });
    expect(out.map((e) => e.id)).toEqual(['3', '2', '1']);
  });

  it('drops entries with no text and no media', () => {
    expect(normalizeJournal({ entries: [entry('1', { text: '   ' })] })).toHaveLength(0);
  });

  it('keeps a media-only entry', () => {
    const out = normalizeJournal({ entries: [entry('1', { text: '', media: { uri: 'file://x.jpg', type: 'image' } })] });
    expect(out).toHaveLength(1);
    expect(out[0]!.media?.type).toBe('image');
  });

  it('coerces a bad audience to private and drops a bad mood', () => {
    const out = normalizeJournal({ entries: [entry('1', { audience: 'world' as never, mood: 'nope' as never })] });
    expect(out[0]!.audience).toBe('private');
    expect(out[0]!.mood).toBeUndefined();
  });

  it('sanitizes follow-ups', () => {
    const out = normalizeJournal({
      entries: [entry('1', { followUps: [{ id: 'a', createdAt: 1, text: 'ok' }, { id: 'b', createdAt: 2, text: '  ' } as never] })],
    });
    expect(out[0]!.followUps.map((f) => f.id)).toEqual(['a']);
  });

  it('returns [] for garbage', () => {
    expect(normalizeJournal(null)).toEqual([]);
    expect(normalizeJournal({ entries: 3 })).toEqual([]);
  });
});

describe('JournalStore', () => {
  it('round-trips entries', async () => {
    const store = new JournalStore(new InMemoryStore());
    await store.save('u1', [entry('2'), entry('1')]);
    expect((await store.load('u1')).map((e) => e.id)).toEqual(['2', '1']);
  });

  it('bounds stored entries', async () => {
    const store = new JournalStore(new InMemoryStore());
    const many = Array.from({ length: MAX_ENTRIES + 10 }, (_, i) => entry(`${i + 1}`));
    await store.save('u1', many);
    expect(await store.load('u1')).toHaveLength(MAX_ENTRIES);
  });
});
