/**
 * Auto-starts the welcome tour exactly once — only on the first run after
 * onboarding, never on re-login. Call it from the Today screen so the targets
 * are mounted/measured before the tour begins. Completion is persisted by the
 * SpotlightProvider's `onDone` (sets `welcomeTourCompleted`).
 */
import { useEffect, useRef } from 'react';
import { useSettings } from '@/state/SettingsContext';
import { useSpotlight } from './SpotlightContext';
import { WELCOME_TOUR } from './welcomeTour';

export function useWelcomeTour() {
  const { settings, ready } = useSettings();
  const { start } = useSpotlight();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    if (settings.onboardingCompleted && !settings.welcomeTourCompleted) {
      started.current = true;
      // Brief delay so target Views finish layout + measure before we highlight.
      const id = setTimeout(() => start(WELCOME_TOUR), 500);
      return () => clearTimeout(id);
    }
  }, [ready, settings.onboardingCompleted, settings.welcomeTourCompleted, start]);
}
