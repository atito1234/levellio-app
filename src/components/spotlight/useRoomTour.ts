/**
 * Auto-starts a room's first-run helper tour exactly once — only after the main
 * onboarding + welcome tour are done, and only if that room's "seen" flag is
 * unset. Completion persists the room flag (so it never re-shows) unless the user
 * re-enables tips in Settings, which clears the flags.
 *
 * IMPORTANT: several rooms (War Room, Planner) are presented as native modal
 * screens. Presenting the spotlight overlay (itself a Modal) while that screen is
 * still animating in deadlocks iOS — a frozen, unresponsive screen. So we only
 * start once the screen has been continuously FOCUSED long enough for its enter
 * transition to finish; if the user navigates away first, the start is cancelled
 * and re-armed when they return (never presenting over the wrong screen).
 */
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSettings } from '@/state/SettingsContext';
import type { AppSettings } from '@/services/settings/appSettings';
import { useSpotlight } from './SpotlightContext';
import { ROOM_TOURS, ROOM_TOUR_FLAG, type RoomKey } from './roomTours';

// Long enough for a native modal-screen enter transition to fully settle before
// we present the overlay on top of it.
const SETTLE_MS = 900;

export function useRoomTour(room: RoomKey) {
  const { settings, ready, update } = useSettings();
  const { start } = useSpotlight();
  const isFocused = useIsFocused();
  const started = useRef(false);
  const flag = ROOM_TOUR_FLAG[room];

  useEffect(() => {
    if (!ready || started.current || !isFocused) return;
    // Hold room tours until the first-run welcome flow is done, so a brand-new
    // user isn't hit with overlapping coach-marks.
    if (!settings.onboardingCompleted || !settings.welcomeTourCompleted) return;
    if (settings[flag]) return;

    const timer = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      start(ROOM_TOURS[room], () => void update({ [flag]: true } as Partial<AppSettings>));
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ready, isFocused, settings, flag, room, start, update]);
}
