/**
 * Auto-starts the welcome tour exactly once — only on the first run after
 * onboarding, never on re-login. Call it from the Today screen so the targets
 * are mounted/measured before the tour begins. Completion is persisted by the
 * SpotlightProvider's `onDone` (sets `welcomeTourCompleted`).
 *
 * IMPORTANT: gate on focus. Today stays mounted when a modal screen (e.g. the
 * "+ Goal" flow) is pushed over it, so a bare timer would fire the tour's overlay
 * (a Modal) while that modal screen is still animating — an iOS nested-modal
 * deadlock that freezes the app. Tying the start to focus cancels it the moment
 * the user navigates away and re-arms it when they return.
 */
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSettings } from '@/state/SettingsContext';
import { useSpotlight } from './SpotlightContext';
import { WELCOME_TOUR } from './welcomeTour';

export function useWelcomeTour() {
  const { settings, ready } = useSettings();
  const { start } = useSpotlight();
  const isFocused = useIsFocused();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current || !isFocused) return;
    if (!settings.onboardingCompleted || settings.welcomeTourCompleted) return;
    // Brief delay so target Views finish layout + measure before we highlight,
    // and so any entering transition has settled before we present the overlay.
    const id = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      start(WELCOME_TOUR);
    }, 600);
    return () => clearTimeout(id);
  }, [ready, isFocused, settings.onboardingCompleted, settings.welcomeTourCompleted, start]);
}
