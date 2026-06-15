import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { battleStore, type BattleProgress } from '@/services/battles';
import type { TechniqueId } from '@/lib/timeTechniques';

interface BattlesContextValue {
  ready: boolean;
  totalSlain: number;
  perDragon: Record<string, number>;
  coins: number;
  lastTechniqueId?: TechniqueId;
  lastCustomMin?: number;
  /** Record a slain dragon + award coins (called on battle victory). */
  recordVictory: (dragonId: string, coinsEarned?: number) => Promise<void>;
  /** Spend coins (e.g. unlocking a gadget). Returns false if too few. */
  spendCoins: (amount: number) => Promise<boolean>;
  /** Remember the user's last technique choice for next time. */
  setTechnique: (id: TechniqueId, customMin?: number) => Promise<void>;
}

const BattlesContext = createContext<BattlesContextValue | null>(null);

/** Owns the "dragons slain" progression — the lifelong-mission tally. */
export function BattlesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [progress, setProgress] = useState<BattleProgress>({ totalSlain: 0, perDragon: {}, coins: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setProgress({ totalSlain: 0, perDragon: {}, coins: 0 });
      setReady(false);
      return;
    }
    battleStore.load(uid).then((p) => {
      if (active) {
        setProgress(p);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: BattleProgress) => {
      setProgress(next);
      if (uid) await battleStore.save(uid, next);
    },
    [uid],
  );

  const recordVictory = useCallback(
    (dragonId: string, coinsEarned = 0) =>
      commit({
        ...progress,
        totalSlain: progress.totalSlain + 1,
        perDragon: { ...progress.perDragon, [dragonId]: (progress.perDragon[dragonId] ?? 0) + 1 },
        coins: progress.coins + Math.max(0, Math.floor(coinsEarned)),
      }),
    [progress, commit],
  );

  const spendCoins = useCallback(
    async (amount: number): Promise<boolean> => {
      const cost = Math.max(0, Math.floor(amount));
      if (progress.coins < cost) return false;
      await commit({ ...progress, coins: progress.coins - cost });
      return true;
    },
    [progress, commit],
  );

  const setTechnique = useCallback(
    (id: TechniqueId, customMin?: number) =>
      commit({ ...progress, lastTechniqueId: id, ...(customMin !== undefined ? { lastCustomMin: customMin } : {}) }),
    [progress, commit],
  );

  const value = useMemo<BattlesContextValue>(
    () => ({
      ready,
      totalSlain: progress.totalSlain,
      perDragon: progress.perDragon,
      coins: progress.coins,
      lastTechniqueId: progress.lastTechniqueId,
      lastCustomMin: progress.lastCustomMin,
      recordVictory,
      spendCoins,
      setTechnique,
    }),
    [ready, progress, recordVictory, spendCoins, setTechnique],
  );

  return <BattlesContext.Provider value={value}>{children}</BattlesContext.Provider>;
}

export function useBattles(): BattlesContextValue {
  const ctx = useContext(BattlesContext);
  if (!ctx) throw new Error('useBattles must be used within a BattlesProvider');
  return ctx;
}
