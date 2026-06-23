/**
 * The one-time first-run welcome tour script. Targets real on-screen elements
 * (the Today focus ring and the add button); the last two steps are centered
 * cards that orient the user to the rest of the app. Copy lives in the `tour`
 * i18n namespace.
 */
import type { TourStep } from './SpotlightContext';

export const WELCOME_TOUR: TourStep[] = [
  { targetId: 'today-focus', titleKey: 'today.title', bodyKey: 'today.body' },
  { targetId: 'add-fab', titleKey: 'add.title', bodyKey: 'add.body' },
  { titleKey: 'community.title', bodyKey: 'community.body' },
  { titleKey: 'finish.title', bodyKey: 'finish.body' },
];
