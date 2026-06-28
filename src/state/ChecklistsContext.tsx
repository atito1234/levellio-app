/**
 * Owns the user's checklists + daily check-out. Mirrors GoalContext: loads
 * per-uid on mount, persists every change, and rolls recurring lists over to the
 * current day on load so ticks reset each day. The check-out ritual + streak are
 * the retention loop.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { ChecklistStore } from '@/services/checklists/checklistStore';
import { AsyncStorageStore } from '@/services/storage';
import {
  checkOutChecklist,
  rolloverChecklist,
  toggleChecklistItem,
  type Checklist,
  type ChecklistItem,
} from '@/lib/checklist';
import { dayKey } from '@/lib/dates';
import type { BucketColorId } from '@/lib/buckets';

const checklistStore = new ChecklistStore(new AsyncStorageStore());

let seq = 0;
const genId = (p: string) => `${p}-${Date.now()}-${(seq += 1)}`;

export interface NewChecklistInput {
  title: string;
  emoji?: string;
  colorId?: BucketColorId;
  recurring?: boolean;
  items?: { label: string; questId?: string }[];
}

interface ChecklistsContextValue {
  ready: boolean;
  /** Active (non-archived) checklists, rolled over to today. */
  checklists: Checklist[];
  addChecklist: (input: NewChecklistInput) => Promise<Checklist | null>;
  removeChecklist: (id: string) => Promise<void>;
  renameChecklist: (id: string, title: string) => Promise<void>;
  addItem: (id: string, label: string, questId?: string) => Promise<void>;
  removeItem: (id: string, itemId: string) => Promise<void>;
  toggleItem: (id: string, itemId: string) => Promise<void>;
  /** Close out a checklist for the day. Returns the resulting streak, or null. */
  checkOut: (id: string) => Promise<{ streak: number; alreadyDoneToday: boolean } | null>;
}

const ChecklistsContext = createContext<ChecklistsContextValue | null>(null);

export function ChecklistsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setChecklists([]);
      setReady(false);
      return;
    }
    checklistStore.load(uid).then((loaded) => {
      if (!active) return;
      // Roll recurring lists over to today so stale ticks don't linger.
      const today = dayKey(new Date());
      setChecklists(loaded.map((c) => rolloverChecklist(c, today)));
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: Checklist[]) => {
      setChecklists(next);
      if (uid) await checklistStore.save(uid, next);
    },
    [uid],
  );

  const update = useCallback(
    async (id: string, fn: (c: Checklist) => Checklist) => {
      await commit(checklists.map((c) => (c.id === id ? fn(c) : c)));
    },
    [checklists, commit],
  );

  const addChecklist = useCallback(
    async (input: NewChecklistInput): Promise<Checklist | null> => {
      if (!uid || input.title.trim().length === 0) return null;
      const checklist: Checklist = {
        id: genId('checklist'),
        title: input.title.trim(),
        emoji: input.emoji ?? '✅',
        colorId: input.colorId ?? 'violet',
        items: (input.items ?? []).map((it) => ({ id: genId('item'), label: it.label, ...(it.questId ? { questId: it.questId } : {}) })),
        recurring: input.recurring !== false,
        createdAt: Date.now(),
        order: checklists.length,
        checkedItemIds: [],
        checkoutStreak: 0,
      };
      await commit([...checklists, checklist]);
      return checklist;
    },
    [uid, checklists, commit],
  );

  const removeChecklist = useCallback(
    async (id: string) => {
      await commit(checklists.filter((c) => c.id !== id));
    },
    [checklists, commit],
  );

  const renameChecklist = useCallback(
    (id: string, title: string) => update(id, (c) => ({ ...c, title: title.trim() || c.title })),
    [update],
  );

  const addItem = useCallback(
    (id: string, label: string, questId?: string) =>
      update(id, (c) => {
        if (!label.trim()) return c;
        const item: ChecklistItem = { id: genId('item'), label: label.trim(), ...(questId ? { questId } : {}) };
        return { ...c, items: [...c.items, item] };
      }),
    [update],
  );

  const removeItem = useCallback(
    (id: string, itemId: string) =>
      update(id, (c) => ({ ...c, items: c.items.filter((i) => i.id !== itemId), checkedItemIds: c.checkedItemIds.filter((x) => x !== itemId) })),
    [update],
  );

  const toggleItem = useCallback(
    (id: string, itemId: string) => update(id, (c) => toggleChecklistItem(c, itemId, dayKey(new Date()))),
    [update],
  );

  const checkOut = useCallback(
    async (id: string): Promise<{ streak: number; alreadyDoneToday: boolean } | null> => {
      const target = checklists.find((c) => c.id === id);
      if (!target) return null;
      const { checklist, streak, alreadyDoneToday } = checkOutChecklist(target, new Date());
      // A checked-out one-off list archives → drops out of the active list.
      const next = checklists.map((c) => (c.id === id ? checklist : c)).filter((c) => !c.archived);
      await commit(next);
      return { streak, alreadyDoneToday };
    },
    [checklists, commit],
  );

  const active = useMemo(() => checklists.filter((c) => !c.archived), [checklists]);

  const value = useMemo<ChecklistsContextValue>(
    () => ({ ready, checklists: active, addChecklist, removeChecklist, renameChecklist, addItem, removeItem, toggleItem, checkOut }),
    [ready, active, addChecklist, removeChecklist, renameChecklist, addItem, removeItem, toggleItem, checkOut],
  );

  return <ChecklistsContext.Provider value={value}>{children}</ChecklistsContext.Provider>;
}

export function useChecklists(): ChecklistsContextValue {
  const ctx = useContext(ChecklistsContext);
  if (!ctx) throw new Error('useChecklists must be used within a ChecklistsProvider');
  return ctx;
}
