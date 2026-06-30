/**
 * Auto-starts a room's first-run helper tour exactly once — only after the main
 * onboarding + welcome tour are done, and only if that room's "seen" flag is
 * unset. Completion persists the room flag (so it never re-shows) unless the user
 * re-enables tips in Settings, which clears the flags. Call it from the room's
 * screen so its targets are mounted before the tour begins.
 */
import { useEffect, useRef } from 'react';
import { useSettings } from '@/state/SettingsContext';
import type { AppSettings } from '@/services/settings/appSettings';
import { useSpotlight } from './SpotlightContext';
import { ROOM_TOURS, ROOM_TOUR_FLAG, type RoomKey } from './roomTours';

export function useRoomTour(room: RoomKey) {
  const { settings, ready, update } = useSettings();
  const { start } = useSpotlight();
  const started = useRef(false);
  const flag = ROOM_TOUR_FLAG[room];

  useEffect(() => {
    if (!ready || started.current) return;
    // Hold room tours until the first-run welcome flow is done, so a brand-new
    // user isn't hit with overlapping coach-marks.
    if (!settings.onboardingCompleted || !settings.welcomeTourCompleted) return;
    if (settings[flag]) return;
    started.current = true;
    // Brief delay so target Views finish layout + measure before we highlight.
    const id = setTimeout(
      () => start(ROOM_TOURS[room], () => void update({ [flag]: true } as Partial<AppSettings>)),
      600,
    );
    return () => clearTimeout(id);
  }, [ready, settings, flag, room, start, update]);
}
