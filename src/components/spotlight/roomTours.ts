/**
 * Per-room first-run helper tours. Each runs once the first time a user enters
 * that room (unless they re-enable tips in Settings). Mostly centered explainer
 * cards — robust, no fragile cross-screen target wiring — except the War Room,
 * which highlights its dragon / war-gadget / missions sections so the guidance
 * points at exactly what it describes. Copy lives in the `tour` i18n namespace
 * under `rooms.<room>.*`.
 */
import type { TourStep } from './SpotlightContext';
import type { AppSettings } from '@/services/settings/appSettings';

export type RoomKey = 'warRoom' | 'planner' | 'feed' | 'projects' | 'settings';

/** Which AppSettings flag records that a room's first-run tour has been seen. */
export const ROOM_TOUR_FLAG: Record<RoomKey, keyof AppSettings> = {
  warRoom: 'warRoomTourSeen',
  planner: 'plannerTourSeen',
  feed: 'feedTourSeen',
  projects: 'projectsTourSeen',
  settings: 'settingsTourSeen',
};

export const ROOM_TOURS: Record<RoomKey, TourStep[]> = {
  warRoom: [
    { titleKey: 'rooms.warRoom.intro.title', bodyKey: 'rooms.warRoom.intro.body' },
    { targetId: 'war-dragon', titleKey: 'rooms.warRoom.dragon.title', bodyKey: 'rooms.warRoom.dragon.body' },
    { targetId: 'war-gadget', titleKey: 'rooms.warRoom.gadget.title', bodyKey: 'rooms.warRoom.gadget.body' },
    { targetId: 'war-missions', titleKey: 'rooms.warRoom.missions.title', bodyKey: 'rooms.warRoom.missions.body' },
  ],
  planner: [
    { titleKey: 'rooms.planner.intro.title', bodyKey: 'rooms.planner.intro.body' },
    { titleKey: 'rooms.planner.checklists.title', bodyKey: 'rooms.planner.checklists.body' },
  ],
  feed: [
    { titleKey: 'rooms.feed.intro.title', bodyKey: 'rooms.feed.intro.body' },
    { titleKey: 'rooms.feed.privacy.title', bodyKey: 'rooms.feed.privacy.body' },
  ],
  projects: [
    { titleKey: 'rooms.projects.intro.title', bodyKey: 'rooms.projects.intro.body' },
    { titleKey: 'rooms.projects.join.title', bodyKey: 'rooms.projects.join.body' },
  ],
  settings: [
    { titleKey: 'rooms.settings.intro.title', bodyKey: 'rooms.settings.intro.body' },
    { titleKey: 'rooms.settings.helpers.title', bodyKey: 'rooms.settings.helpers.body' },
  ],
};
