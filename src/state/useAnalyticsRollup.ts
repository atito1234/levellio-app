/**
 * Durable analytics history. The session log is capped (old events are trimmed),
 * so this hook snapshots each day's compact rollup into the rollupStore and keeps
 * it forever-ish (bounded to ~13 months). Readers get stored history MERGED with
 * the still-live recent days, so long-term trends survive while today stays fresh.
 *
 * Mirrors useActivityLog/useMaterializeRecurring: compute from the live log,
 * persist past days exactly, and re-snapshot idempotently (recent overwrites).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { rollupStore, type RollupDays } from '@/services/analytics';
import { sessionsOf } from '@/lib/analytics';
import { mergeRollups, rollupDays } from '@/lib/metrics/rollup';
import type { MetadataEvent } from '@/lib/metadata';

export function useAnalyticsRollup(events: readonly MetadataEvent[]): {
  rollups: RollupDays;
  ready: boolean;
} {
  const { user } = useGame();
  const uid = user?.uid ?? null;
  const [history, setHistory] = useState<RollupDays>({});
  const [ready, setReady] = useState(false);
  const savedSig = useRef<string>('');

  // Load persisted history when the user changes.
  useEffect(() => {
    let active = true;
    if (!uid) {
      setHistory({});
      setReady(false);
      return;
    }
    setReady(false);
    rollupStore.load(uid).then((h) => {
      if (active) {
        setHistory(h);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  // Recent rollups computed from the live (capped) session log.
  const recent = useMemo(() => rollupDays(sessionsOf(events)), [events]);
  const merged = useMemo(() => mergeRollups(history, recent), [history, recent]);

  // Persist the merged history so trimmed-away days survive. Idempotent: only
  // write when the merged content actually changes.
  useEffect(() => {
    if (!uid || !ready) return;
    const sig = JSON.stringify(merged);
    if (sig === savedSig.current) return;
    savedSig.current = sig;
    void rollupStore.save(uid, merged);
  }, [uid, ready, merged]);

  return { rollups: merged, ready };
}
