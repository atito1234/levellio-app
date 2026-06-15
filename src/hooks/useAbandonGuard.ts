/**
 * Tiny convenience over InterventionContext.guard so a quit/skip call site stays
 * ~3 lines: `if (guardAbandon({...})) return;` then run the action only when it
 * didn't intervene.
 */
import { useIntervention, type GuardInput } from '@/state/InterventionContext';

export function useAbandonGuard(): (input: GuardInput) => boolean {
  return useIntervention().guard;
}
