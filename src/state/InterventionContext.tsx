/**
 * "Think twice" intervention state — a single-slot request holder that lets any
 * destructive/quit action be paused for a coaching nudge. Mirrors the
 * Milestones queue pattern but holds one request at a time (interventions are
 * modal). The deferred action is carried so the overlay can run it on "Leave
 * anyway". Per-session anti-nag suppression lives here (intervene at most once
 * per abandon-kind per session).
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { shouldIntervene, type AbandonContext, type AbandonKind } from '@/lib/intervention';

export interface InterventionRequest {
  id: string;
  kind: AbandonKind;
  dragonId?: string;
  dragonName?: string;
  questId?: string;
  /** The deferred destructive action — run on "Leave anyway". */
  onProceed: () => void;
}

export interface GuardInput {
  kind: AbandonKind;
  /** Stakes signals for the policy (streak / selection / running). */
  ctx: Omit<AbandonContext, 'kind'>;
  dragonId?: string;
  dragonName?: string;
  questId?: string;
  onProceed: () => void;
}

interface InterventionContextValue {
  current: InterventionRequest | null;
  /** Returns true if it intervened (caller must NOT run its action itself). */
  guard: (input: GuardInput) => boolean;
  /** "Leave anyway": run the deferred action and clear. */
  proceed: () => void;
  /** "Face it": cancel the action and clear (caller navigates to coaching). */
  faceIt: () => void;
}

const Ctx = createContext<InterventionContextValue | null>(null);

let seq = 0;

export function InterventionProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<InterventionRequest | null>(null);
  const suppressed = useRef<Set<AbandonKind>>(new Set());

  const guard = useCallback((input: GuardInput): boolean => {
    if (suppressed.current.has(input.kind)) return false;
    if (!shouldIntervene({ kind: input.kind, ...input.ctx })) return false;
    suppressed.current.add(input.kind);
    seq += 1;
    setCurrent({
      id: `intv-${seq}`,
      kind: input.kind,
      onProceed: input.onProceed,
      ...(input.dragonId ? { dragonId: input.dragonId } : {}),
      ...(input.dragonName ? { dragonName: input.dragonName } : {}),
      ...(input.questId ? { questId: input.questId } : {}),
    });
    return true;
  }, []);

  const proceed = useCallback(() => {
    setCurrent((c) => {
      c?.onProceed();
      return null;
    });
  }, []);

  const faceIt = useCallback(() => setCurrent(null), []);

  const value = useMemo(() => ({ current, guard, proceed, faceIt }), [current, guard, proceed, faceIt]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIntervention(): InterventionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useIntervention must be used within an InterventionProvider');
  return ctx;
}
