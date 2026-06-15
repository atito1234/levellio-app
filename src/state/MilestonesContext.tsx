import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { milestoneStore } from '@/services/milestones';
import type { Milestone } from '@/lib/milestones';

interface MilestonesContextValue {
  ready: boolean;
  /** All milestones earned so far. */
  earned: Milestone[];
  /** Ids of earned milestones (idempotency guard for detection). */
  earnedIds: Set<string>;
  /** Milestones waiting to be celebrated (FIFO). */
  queue: Milestone[];
  /** Persist newly-earned milestones and enqueue them for celebration. */
  recordMilestones: (milestones: readonly Milestone[]) => Promise<void>;
  /** Remove the front of the celebration queue (after it's shown). */
  popQueue: () => void;
}

const MilestonesContext = createContext<MilestonesContextValue | null>(null);

/**
 * Owns earned milestones + a celebration queue so several wins from one
 * completion play in sequence. Mirrors the other per-domain providers.
 */
export function MilestonesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [earned, setEarned] = useState<Milestone[]>([]);
  const [queue, setQueue] = useState<Milestone[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setEarned([]);
      setQueue([]);
      setReady(false);
      return;
    }
    milestoneStore.load(uid).then((loaded) => {
      if (active) {
        setEarned(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const earnedIds = useMemo(() => new Set(earned.map((m) => m.id)), [earned]);

  const recordMilestones = useCallback(
    async (milestones: readonly Milestone[]) => {
      const fresh = milestones.filter((m) => !earnedIds.has(m.id));
      if (fresh.length === 0) return;
      const nextEarned = [...earned, ...fresh];
      setEarned(nextEarned);
      setQueue((q) => [...q, ...fresh]);
      if (uid) await milestoneStore.save(uid, nextEarned);
    },
    [uid, earned, earnedIds],
  );

  const popQueue = useCallback(() => setQueue((q) => q.slice(1)), []);

  const value = useMemo<MilestonesContextValue>(
    () => ({ ready, earned, earnedIds, queue, recordMilestones, popQueue }),
    [ready, earned, earnedIds, queue, recordMilestones, popQueue],
  );

  return <MilestonesContext.Provider value={value}>{children}</MilestonesContext.Provider>;
}

export function useMilestones(): MilestonesContextValue {
  const ctx = useContext(MilestonesContext);
  if (!ctx) throw new Error('useMilestones must be used within a MilestonesProvider');
  return ctx;
}
