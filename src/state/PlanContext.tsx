import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { planStore, type PlanDays } from '@/services/plan';

interface PlanContextValue {
  ready: boolean;
  /** Plan membership per local day (YYYY-MM-DD → ordered quest ids). */
  plans: PlanDays;
  /** The plan for a day, or undefined when none is set (callers fall back to all). */
  getPlan: (dayKey: string) => string[] | undefined;
  /** Replace a day's plan with an explicit ordered id list. */
  setPlan: (dayKey: string, ids: string[]) => Promise<void>;
  /** Add/remove a habit from a day's plan (materializes an explicit plan). */
  togglePlanned: (dayKey: string, id: string) => Promise<void>;
  /** Reorder a day's plan. */
  reorderPlan: (dayKey: string, ids: string[]) => Promise<void>;
  /** Merge ids into a target day's plan (de-duped) — used to carry gaps forward. */
  carryOver: (toDayKey: string, ids: string[]) => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

/**
 * Owns the persisted per-day plan — the single source of truth the home reads to
 * show only what the user committed to, and the Plan screen edits. Mirrors the
 * CapacitiesProvider persistence pattern (on-device, Firebase stubbed).
 */
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [plans, setPlans] = useState<PlanDays>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setPlans({});
      setReady(false);
      return;
    }
    planStore.load(uid).then((data) => {
      if (active) {
        setPlans(data.days);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: PlanDays) => {
      setPlans(next);
      if (uid) await planStore.save(uid, { days: next });
    },
    [uid],
  );

  const getPlan = useCallback((dayKey: string) => plans[dayKey], [plans]);

  const setPlan = useCallback(
    (dayKey: string, ids: string[]) => commit({ ...plans, [dayKey]: [...new Set(ids)] }),
    [plans, commit],
  );

  const togglePlanned = useCallback(
    (dayKey: string, id: string) => {
      const cur = plans[dayKey] ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return commit({ ...plans, [dayKey]: next });
    },
    [plans, commit],
  );

  const reorderPlan = useCallback(
    (dayKey: string, ids: string[]) => commit({ ...plans, [dayKey]: [...new Set(ids)] }),
    [plans, commit],
  );

  const carryOver = useCallback(
    (toDayKey: string, ids: string[]) => {
      const cur = plans[toDayKey] ?? [];
      return commit({ ...plans, [toDayKey]: [...new Set([...cur, ...ids])] });
    },
    [plans, commit],
  );

  const value = useMemo<PlanContextValue>(
    () => ({ ready, plans, getPlan, setPlan, togglePlanned, reorderPlan, carryOver }),
    [ready, plans, getPlan, setPlan, togglePlanned, reorderPlan, carryOver],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within a PlanProvider');
  return ctx;
}
