import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { capacityStore, type CapacityHistory } from '@/services/capacities';
import { applyDeltas, emptyLevels, type CapacityLevels } from '@/lib/compounding';
import { rippleForQuest } from '@/lib/habitCapacity';
import { dayKey } from '@/lib/dates';
import type { Quest } from '@/types';

interface CapacitiesContextValue {
  ready: boolean;
  levels: CapacityLevels;
  /** Per-calendar-day capacity points earned (for the monthly heatmap). */
  history: CapacityHistory;
  /** Apply a completed habit's ripple to the persisted levels + day history. */
  recordCompletion: (quest: Pick<Quest, 'category'>) => Promise<void>;
}

const CapacitiesContext = createContext<CapacitiesContextValue | null>(null);

/**
 * Owns the persisted capacity ring levels + a per-day history — the single
 * source of truth the home, the Ripple, the Connections map, and the monthly
 * progress view all read. Completing a habit ripples here once.
 */
export function CapacitiesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [levels, setLevels] = useState<CapacityLevels>(emptyLevels);
  const [history, setHistory] = useState<CapacityHistory>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setLevels(emptyLevels());
      setHistory({});
      setReady(false);
      return;
    }
    capacityStore.load(uid).then((data) => {
      if (active) {
        setLevels(data.levels);
        setHistory(data.history);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const recordCompletion = useCallback(
    async (quest: Pick<Quest, 'category'>) => {
      if (!uid) return;
      const deltas = rippleForQuest(quest);
      const points = deltas.reduce((sum, d) => sum + d.delta, 0);
      const nextLevels = applyDeltas(levels, deltas);
      const today = dayKey(new Date());
      const nextHistory: CapacityHistory = { ...history, [today]: (history[today] ?? 0) + points };
      setLevels(nextLevels);
      setHistory(nextHistory);
      await capacityStore.save(uid, { levels: nextLevels, history: nextHistory });
    },
    [uid, levels, history],
  );

  const value = useMemo<CapacitiesContextValue>(
    () => ({ ready, levels, history, recordCompletion }),
    [ready, levels, history, recordCompletion],
  );

  return <CapacitiesContext.Provider value={value}>{children}</CapacitiesContext.Provider>;
}

export function useCapacities(): CapacitiesContextValue {
  const ctx = useContext(CapacitiesContext);
  if (!ctx) throw new Error('useCapacities must be used within a CapacitiesProvider');
  return ctx;
}
