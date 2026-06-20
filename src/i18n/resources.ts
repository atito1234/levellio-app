/**
 * Static resource registry. Bundling the JSON at build time (rather than lazy
 * HTTP loading) keeps the app fully offline-capable — important for testers on
 * patchy connections in Haiti — and lets unit tests import the same map.
 *
 * To add a namespace: create locales/<lang>/<ns>.json for every locale, list it
 * in NAMESPACES (config.ts), and add the imports below.
 */
import type { Namespace, SupportedLocale } from './config';

import en_common from './locales/en/common.json';
import en_tabs from './locales/en/tabs.json';
import en_feed from './locales/en/feed.json';
import en_settings from './locales/en/settings.json';
import en_paywall from './locales/en/paywall.json';
import en_profile from './locales/en/profile.json';
import en_notifications from './locales/en/notifications.json';
import en_discover from './locales/en/discover.json';
import en_stories from './locales/en/stories.json';
import en_messaging from './locales/en/messaging.json';
import en_ai from './locales/en/ai.json';
import en_onboarding from './locales/en/onboarding.json';
import en_auth from './locales/en/auth.json';
import en_dashboard from './locales/en/dashboard.json';
import en_capacities from './locales/en/capacities.json';
import en_hero from './locales/en/hero.json';

import fr_common from './locales/fr/common.json';
import fr_tabs from './locales/fr/tabs.json';
import fr_feed from './locales/fr/feed.json';
import fr_settings from './locales/fr/settings.json';
import fr_paywall from './locales/fr/paywall.json';
import fr_profile from './locales/fr/profile.json';
import fr_notifications from './locales/fr/notifications.json';
import fr_discover from './locales/fr/discover.json';
import fr_stories from './locales/fr/stories.json';
import fr_messaging from './locales/fr/messaging.json';
import fr_ai from './locales/fr/ai.json';
import fr_onboarding from './locales/fr/onboarding.json';
import fr_auth from './locales/fr/auth.json';
import fr_dashboard from './locales/fr/dashboard.json';
import fr_capacities from './locales/fr/capacities.json';
import fr_hero from './locales/fr/hero.json';

import es_common from './locales/es/common.json';
import es_tabs from './locales/es/tabs.json';
import es_feed from './locales/es/feed.json';
import es_settings from './locales/es/settings.json';
import es_paywall from './locales/es/paywall.json';
import es_profile from './locales/es/profile.json';
import es_notifications from './locales/es/notifications.json';
import es_discover from './locales/es/discover.json';
import es_stories from './locales/es/stories.json';
import es_messaging from './locales/es/messaging.json';
import es_ai from './locales/es/ai.json';
import es_onboarding from './locales/es/onboarding.json';
import es_auth from './locales/es/auth.json';
import es_dashboard from './locales/es/dashboard.json';
import es_capacities from './locales/es/capacities.json';
import es_hero from './locales/es/hero.json';

import ht_common from './locales/ht/common.json';
import ht_tabs from './locales/ht/tabs.json';
import ht_feed from './locales/ht/feed.json';
import ht_settings from './locales/ht/settings.json';
import ht_paywall from './locales/ht/paywall.json';
import ht_profile from './locales/ht/profile.json';
import ht_notifications from './locales/ht/notifications.json';
import ht_discover from './locales/ht/discover.json';
import ht_stories from './locales/ht/stories.json';
import ht_messaging from './locales/ht/messaging.json';
import ht_ai from './locales/ht/ai.json';
import ht_onboarding from './locales/ht/onboarding.json';
import ht_auth from './locales/ht/auth.json';
import ht_dashboard from './locales/ht/dashboard.json';
import ht_capacities from './locales/ht/capacities.json';
import ht_hero from './locales/ht/hero.json';

export type ResourceBundle = Record<Namespace, Record<string, unknown>>;

export const resources: Record<SupportedLocale, ResourceBundle> = {
  en: { common: en_common, tabs: en_tabs, feed: en_feed, settings: en_settings, paywall: en_paywall, profile: en_profile, notifications: en_notifications, discover: en_discover, stories: en_stories, messaging: en_messaging, ai: en_ai, onboarding: en_onboarding, auth: en_auth, dashboard: en_dashboard, capacities: en_capacities, hero: en_hero },
  fr: { common: fr_common, tabs: fr_tabs, feed: fr_feed, settings: fr_settings, paywall: fr_paywall, profile: fr_profile, notifications: fr_notifications, discover: fr_discover, stories: fr_stories, messaging: fr_messaging, ai: fr_ai, onboarding: fr_onboarding, auth: fr_auth, dashboard: fr_dashboard, capacities: fr_capacities, hero: fr_hero },
  es: { common: es_common, tabs: es_tabs, feed: es_feed, settings: es_settings, paywall: es_paywall, profile: es_profile, notifications: es_notifications, discover: es_discover, stories: es_stories, messaging: es_messaging, ai: es_ai, onboarding: es_onboarding, auth: es_auth, dashboard: es_dashboard, capacities: es_capacities, hero: es_hero },
  ht: { common: ht_common, tabs: ht_tabs, feed: ht_feed, settings: ht_settings, paywall: ht_paywall, profile: ht_profile, notifications: ht_notifications, discover: ht_discover, stories: ht_stories, messaging: ht_messaging, ai: ht_ai, onboarding: ht_onboarding, auth: ht_auth, dashboard: ht_dashboard, capacities: ht_capacities, hero: ht_hero },
};
