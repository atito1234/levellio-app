import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { battleStore, EMPTY_BATTLE_PROGRESS, type BattleProgress, type DragonStreak } from '@/services/battles';
import { recordDragonVictory, buyUnlock as buyUnlockPure } from '@/lib/battleProgress';
import { unlockById } from '@/data/battleUnlocks';
import type { TechniqueId } from '@/lib/timeTechniques';

interface BattlesContextValue {
  ready: boolean;
  totalSlain: number;
  perDragon: Record<string, number>;
  perDragonStreak: Record<string, DragonStreak>;
  coins: number;
  ownedUnlocks: string[];
  ritesPerformed: number;
  lastTechniqueId?: TechniqueId;
  lastCustomMin?: number;
  /** The prep rite performed for the NEXT battle (transient, consumed on victory). */
  preparedRite: string | null;
  /** Mark a pre-battle prep rite as done (or clear with null). */
  setPreparedRite: (riteId: string | null) => void;
  /** Record a slain dragon + award coins; consumes any prepared rite. */
  recordVictory: (dragonId: string, coinsEarned?: number) => Promise<void>;
  /** Spend coins (e.g. unlocking a gadget). Returns false if too few. */
  spendCoins: (amount: number) => Promise<boolean>;
  /** Buy a cosmetic Armory unlock by id. Returns false if unaffordable/owned. */
  buyUnlock: (id: string) => Promise<boolean>;
  /** Remember the user's last technique choice for next time. */
  setTechnique: (id: TechniqueId, customMin?: number) => Promise<void>;
}

const BattlesContext = createContext<BattlesContextValue | null>(null);

/** Owns the "dragons slain" progression — the lifelong-mission tally. */
export function BattlesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [progress, setProgress] = useState<BattleProgress>({ ...EMPTY_BATTLE_PROGRESS });
  const [ready, setReady] = useState(false);
  const [preparedRite, setPreparedRite] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setProgress({ ...EMPTY_BATTLE_PROGRESS });
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
    async (dragonId: string, coinsEarned = 0) => {
      const prepared = preparedRite !== null;
      await commit(recordDragonVictory(progress, dragonId, new Date(), { coinsEarned, prepared }));
      setPreparedRite(null); // consume the rite
    },
    [progress, commit, preparedRite],
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

  const buyUnlock = useCallback(
    async (id: string): Promise<boolean> => {
      const unlock = unlockById(id);
      if (!unlock) return false;
      const next = buyUnlockPure(progress, id, unlock.cost);
      if (!next) return false;
      await commit(next);
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
      perDragonStreak: progress.perDragonStreak,
      coins: progress.coins,
      ownedUnlocks: progress.ownedUnlocks,
      ritesPerformed: progress.ritesPerformed,
      lastTechniqueId: progress.lastTechniqueId,
      lastCustomMin: progress.lastCustomMin,
      preparedRite,
      setPreparedRite,
      recordVictory,
      spendCoins,
      buyUnlock,
      setTechnique,
    }),
    [ready, progress, preparedRite, recordVictory, spendCoins, buyUnlock, setTechnique],
  );

  return <BattlesContext.Provider value={value}>{children}</BattlesContext.Provider>;
}

export function useBattles(): BattlesContextValue {
  const ctx = useContext(BattlesContext);
  if (!ctx) throw new Error('useBattles must be used within a BattlesProvider');
  return ctx;
}
