import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { capacityStore } from '@/services/capacities';
import { applyDeltas, emptyLevels, type CapacityLevels } from '@/lib/compounding';
import { rippleForQuest } from '@/lib/habitCapacity';
import type { Quest } from '@/types';

interface CapacitiesContextValue {
  ready: boolean;
  levels: CapacityLevels;
  /** Apply a completed habit's ripple to the persisted capacity levels. */
  recordCompletion: (quest: Pick<Quest, 'category'>) => Promise<void>;
}

const CapacitiesContext = createContext<CapacitiesContextValue | null>(null);

/**
 * Owns the persisted capacity ring levels — the single source of truth that the
 * home, the Ripple, and the Connections map all read. Completing a habit
 * anywhere ripples here once, and every screen reflects it.
 */
export function CapacitiesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [levels, setLevels] = useState<CapacityLevels>(emptyLevels);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setLevels(emptyLevels());
      setReady(false);
      return;
    }
    capacityStore.load(uid).then((loaded) => {
      if (active) {
        setLevels(loaded);
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
      const next = applyDeltas(levels, rippleForQuest(quest));
      setLevels(next);
      await capacityStore.save(uid, next);
    },
    [uid, levels],
  );

  const value = useMemo<CapacitiesContextValue>(
    () => ({ ready, levels, recordCompletion }),
    [ready, levels, recordCompletion],
  );

  return <CapacitiesContext.Provider value={value}>{children}</CapacitiesContext.Provider>;
}

export function useCapacities(): CapacitiesContextValue {
  const ctx = useContext(CapacitiesContext);
  if (!ctx) throw new Error('useCapacities must be used within a CapacitiesProvider');
  return ctx;
}
