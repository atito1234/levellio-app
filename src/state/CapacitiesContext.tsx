import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useGame } from '@/state/GameContext';
import { capacityStore, type CapacityHistory } from '@/services/capacities';
import { metadataStore } from '@/services/metadata';
import { sessionsOf } from '@/lib/analytics';
import { type CapacityLevels } from '@/lib/compounding';
import { capacityLevelsFromSessions, rippleForQuest } from '@/lib/habitCapacity';
import { dayKey } from '@/lib/dates';
import type { Quest } from '@/types';

/** The minimal session shape the rolling-window rings need. */
type WindowSession = { category?: string; createdAt: number };

interface CapacitiesContextValue {
  ready: boolean;
  /** Ring levels (0-100) derived from a rolling window of REAL recent sessions. */
  levels: CapacityLevels;
  /** Per-calendar-day capacity points earned (for the monthly heatmap). */
  history: CapacityHistory;
  /** Apply a completed habit's ripple to the rings (this session) + day history. */
  recordCompletion: (quest: Pick<Quest, 'category'>) => Promise<void>;
}

const CapacitiesContext = createContext<CapacitiesContextValue | null>(null);

/**
 * Owns the capacity rings + per-day history. Rings are DERIVED from the recent
 * session log (a rolling window) rather than an ever-accumulating total, so they
 * reflect "how am I doing lately" — a fresh day starts honest, today's wins move
 * them, and a quiet stretch lets them fade. History stays cumulative for the
 * monthly heatmap.
 */
export function CapacitiesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [sessions, setSessions] = useState<WindowSession[]>([]);
  const [history, setHistory] = useState<CapacityHistory>({});
  const [ready, setReady] = useState(false);
  // Bumped to force a window recompute (e.g. when the day rolls over).
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setSessions([]);
      setHistory({});
      setReady(false);
      return;
    }
    Promise.all([metadataStore.load(uid), capacityStore.load(uid)]).then(([events, data]) => {
      if (!active) return;
      setSessions(sessionsOf(events).map((s) => ({ category: s.category, createdAt: s.createdAt })));
      setHistory(data.history);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  // On return to foreground, recompute so rings fade as old sessions age out.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  const levels = useMemo<CapacityLevels>(
    () => capacityLevelsFromSessions(sessions, undefined, new Date()),
    // `tick` intentionally invalidates the window across a day boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, tick],
  );

  const recordCompletion = useCallback(
    async (quest: Pick<Quest, 'category'>) => {
      if (!uid) return;
      const now = Date.now();
      const points = rippleForQuest(quest).reduce((sum, d) => sum + d.delta, 0);
      const today = dayKey(new Date(now));
      const nextSessions = [...sessions, { category: quest.category, createdAt: now }];
      const nextHistory: CapacityHistory = { ...history, [today]: (history[today] ?? 0) + points };
      setSessions(nextSessions);
      setHistory(nextHistory);
      // Persist a fresh ring snapshot (for any reader) + the cumulative history.
      await capacityStore.save(uid, {
        levels: capacityLevelsFromSessions(nextSessions, undefined, new Date(now)),
        history: nextHistory,
      });
    },
    [uid, sessions, history],
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
