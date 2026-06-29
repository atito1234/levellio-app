/**
 * Tracks which achievements the user has already seen (persisted per-uid), so the
 * gallery can mark new unlocks. Deliberately light — the EARNED state is computed
 * live from analytics in the screen (useAchievementStats + evaluateAchievements);
 * this only remembers what's been acknowledged.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { achievementsStore } from '@/services/achievements/achievementsStore';

interface AchievementsContextValue {
  ready: boolean;
  seen: Set<string>;
  /** Mark these achievement ids as seen (merges + persists). */
  markSeen: (ids: readonly string[]) => void;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setSeen(new Set());
      setReady(false);
      return;
    }
    achievementsStore.loadSeen(uid).then((ids) => {
      if (active) {
        setSeen(new Set(ids));
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const markSeen = useCallback(
    (ids: readonly string[]) => {
      setSeen((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of ids) if (!next.has(id)) { next.add(id); changed = true; }
        if (changed && uid) void achievementsStore.saveSeen(uid, [...next]);
        return changed ? next : prev;
      });
    },
    [uid],
  );

  const value = useMemo<AchievementsContextValue>(() => ({ ready, seen, markSeen }), [ready, seen, markSeen]);
  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>;
}

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error('useAchievements must be used within an AchievementsProvider');
  return ctx;
}
