import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { planStore, type PlanDays } from '@/services/plan';
import { materializeInto } from '@/lib/recurrence';
import { clearPlanDays, clearedPlanDayKeys } from '@/lib/dataReset';

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
  /**
   * Materialize recurring habits into one or more days' plans exactly once, in a
   * single write. Per day: no-op if there are no ids, or the day was already
   * materialized (so a habit the user removes for that day stays removed).
   */
  ensureMaterialized: (entries: { dayKey: string; ids: string[] }[]) => Promise<void>;
  /**
   * Destructively clear plans for a scope: `undefined` weekdays wipes ALL days,
   * otherwise only days falling on those weekdays (0=Sun…6=Sat). Powers the
   * Settings danger zone.
   */
  clearPlans: (weekdays?: readonly number[]) => Promise<void>;
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
  const [materialized, setMaterialized] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setPlans({});
      setMaterialized([]);
      setReady(false);
      return;
    }
    planStore.load(uid).then((data) => {
      if (active) {
        setPlans(data.days);
        setMaterialized(data.materializedDays);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: PlanDays, nextMaterialized?: string[]) => {
      setPlans(next);
      const marks = nextMaterialized ?? materialized;
      if (nextMaterialized) setMaterialized(nextMaterialized);
      if (uid) await planStore.save(uid, { days: next, materializedDays: marks });
    },
    [uid, materialized],
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

  const ensureMaterialized = useCallback(
    (entries: { dayKey: string; ids: string[] }[]) => {
      const next = materializeInto(plans, materialized, entries);
      if (!next) return Promise.resolve();
      return commit(next.days, next.materialized);
    },
    [plans, materialized, commit],
  );

  const clearPlans = useCallback(
    (weekdays?: readonly number[]) => {
      const nextDays = clearPlanDays(plans, weekdays);
      const cleared = new Set(clearedPlanDayKeys(plans, weekdays));
      const nextMaterialized = materialized.filter((d) => !cleared.has(d));
      return commit(nextDays, nextMaterialized);
    },
    [plans, materialized, commit],
  );

  const value = useMemo<PlanContextValue>(
    () => ({ ready, plans, getPlan, setPlan, togglePlanned, reorderPlan, carryOver, ensureMaterialized, clearPlans }),
    [ready, plans, getPlan, setPlan, togglePlanned, reorderPlan, carryOver, ensureMaterialized, clearPlans],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within a PlanProvider');
  return ctx;
}
