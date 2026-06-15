import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { journalStore } from '@/services/journal';
import type { JournalAudience, JournalEntry, JournalMedia, JournalMood } from '@/lib/journal';

let seq = 0;
function genId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export interface NewJournalEntry {
  text: string;
  audience: JournalAudience;
  mood?: JournalMood;
  media?: JournalMedia;
  dragonId?: string;
  dragonName?: string;
  questIds?: string[];
}

interface JournalContextValue {
  ready: boolean;
  entries: JournalEntry[];
  addEntry: (input: NewJournalEntry) => Promise<JournalEntry | null>;
  addFollowUp: (entryId: string, text: string) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  entriesForDragon: (dragonId: string) => JournalEntry[];
}

const JournalContext = createContext<JournalContextValue | null>(null);

/** Owns the on-device battle journal (private now; social with the backend). */
export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setEntries([]);
      setReady(false);
      return;
    }
    journalStore.load(uid).then((loaded) => {
      if (active) {
        setEntries(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: JournalEntry[]) => {
      setEntries(next);
      if (uid) await journalStore.save(uid, next);
    },
    [uid],
  );

  const addEntry = useCallback(
    async (input: NewJournalEntry): Promise<JournalEntry | null> => {
      if (!uid) return null;
      if (input.text.trim().length === 0 && !input.media) return null;
      const entry: JournalEntry = {
        id: genId('jrnl'),
        createdAt: Date.now(),
        text: input.text.trim(),
        audience: input.audience,
        followUps: [],
        ...(input.mood ? { mood: input.mood } : {}),
        ...(input.media ? { media: input.media } : {}),
        ...(input.dragonId ? { dragonId: input.dragonId } : {}),
        ...(input.dragonName ? { dragonName: input.dragonName } : {}),
        ...(input.questIds && input.questIds.length > 0 ? { questIds: input.questIds } : {}),
      };
      await commit([entry, ...entries]); // newest first
      return entry;
    },
    [uid, entries, commit],
  );

  const addFollowUp = useCallback(
    async (entryId: string, text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      await commit(
        entries.map((e) =>
          e.id === entryId
            ? { ...e, followUps: [...e.followUps, { id: genId('note'), createdAt: Date.now(), text: trimmed }] }
            : e,
        ),
      );
    },
    [entries, commit],
  );

  const removeEntry = useCallback((id: string) => commit(entries.filter((e) => e.id !== id)), [entries, commit]);

  const entriesForDragon = useCallback(
    (dragonId: string) => entries.filter((e) => e.dragonId === dragonId),
    [entries],
  );

  const value = useMemo<JournalContextValue>(
    () => ({ ready, entries, addEntry, addFollowUp, removeEntry, entriesForDragon }),
    [ready, entries, addEntry, addFollowUp, removeEntry, entriesForDragon],
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within a JournalProvider');
  return ctx;
}
