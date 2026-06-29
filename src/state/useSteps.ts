/**
 * useSteps — read today's step count behind the `HEALTH_STEPS_ENABLED` flag (B2a).
 * Inert until a custom EAS dev build provides a real pedometer source (see
 * `src/services/health/stepsService.ts`). When the flag is off this returns a
 * stable "unavailable / 0" shape so callers can render nothing extra.
 */
import { useEffect, useState } from 'react';
import { HEALTH_STEPS_ENABLED } from '@/config/features';
import { stepsService } from '@/services/health/stepsService';

export interface StepsState {
  /** A real device step source is available (custom dev build + permission). */
  available: boolean;
  /** Steps recorded today (0 when unavailable). */
  todaySteps: number;
  /** True once the initial availability/count check has resolved. */
  ready: boolean;
}

const OFF: StepsState = { available: false, todaySteps: 0, ready: true };

export function useSteps(): StepsState {
  const [state, setState] = useState<StepsState>(HEALTH_STEPS_ENABLED ? { available: false, todaySteps: 0, ready: false } : OFF);

  useEffect(() => {
    if (!HEALTH_STEPS_ENABLED) return;
    let active = true;
    let unsub: (() => void) | undefined;
    void (async () => {
      const available = await stepsService.isAvailable();
      const todaySteps = available ? await stepsService.getTodaySteps() : 0;
      if (!active) return;
      setState({ available, todaySteps, ready: true });
      if (available) {
        unsub = stepsService.subscribeToday((steps) => {
          if (active) setState((s) => ({ ...s, todaySteps: steps }));
        });
      }
    })();
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return state;
}
