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
import en_danger from './locales/en/danger.json';
import en_projects from './locales/en/projects.json';
import en_featured from './locales/en/featured.json';
import en_addActivity from './locales/en/addActivity.json';
import en_goals from './locales/en/goals.json';
import en_quests from './locales/en/quests.json';
import en_quickCapture from './locales/en/quickCapture.json';

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
import fr_danger from './locales/fr/danger.json';
import fr_projects from './locales/fr/projects.json';
import fr_featured from './locales/fr/featured.json';
import fr_addActivity from './locales/fr/addActivity.json';
import fr_goals from './locales/fr/goals.json';
import fr_quests from './locales/fr/quests.json';
import fr_quickCapture from './locales/fr/quickCapture.json';

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
import es_danger from './locales/es/danger.json';
import es_projects from './locales/es/projects.json';
import es_featured from './locales/es/featured.json';
import es_addActivity from './locales/es/addActivity.json';
import es_goals from './locales/es/goals.json';
import es_quests from './locales/es/quests.json';
import es_quickCapture from './locales/es/quickCapture.json';

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
import ht_danger from './locales/ht/danger.json';
import ht_projects from './locales/ht/projects.json';
import ht_featured from './locales/ht/featured.json';
import ht_addActivity from './locales/ht/addActivity.json';
import ht_goals from './locales/ht/goals.json';
import ht_quests from './locales/ht/quests.json';
import ht_quickCapture from './locales/ht/quickCapture.json';

export type ResourceBundle = Record<Namespace, Record<string, unknown>>;

export const resources: Record<SupportedLocale, ResourceBundle> = {
  en: { common: en_common, tabs: en_tabs, feed: en_feed, settings: en_settings, paywall: en_paywall, profile: en_profile, notifications: en_notifications, discover: en_discover, stories: en_stories, messaging: en_messaging, ai: en_ai, onboarding: en_onboarding, auth: en_auth, dashboard: en_dashboard, capacities: en_capacities, hero: en_hero, danger: en_danger, projects: en_projects, featured: en_featured, addActivity: en_addActivity, goals: en_goals, quests: en_quests, quickCapture: en_quickCapture },
  fr: { common: fr_common, tabs: fr_tabs, feed: fr_feed, settings: fr_settings, paywall: fr_paywall, profile: fr_profile, notifications: fr_notifications, discover: fr_discover, stories: fr_stories, messaging: fr_messaging, ai: fr_ai, onboarding: fr_onboarding, auth: fr_auth, dashboard: fr_dashboard, capacities: fr_capacities, hero: fr_hero, danger: fr_danger, projects: fr_projects, featured: fr_featured, addActivity: fr_addActivity, goals: fr_goals, quests: fr_quests, quickCapture: fr_quickCapture },
  es: { common: es_common, tabs: es_tabs, feed: es_feed, settings: es_settings, paywall: es_paywall, profile: es_profile, notifications: es_notifications, discover: es_discover, stories: es_stories, messaging: es_messaging, ai: es_ai, onboarding: es_onboarding, auth: es_auth, dashboard: es_dashboard, capacities: es_capacities, hero: es_hero, danger: es_danger, projects: es_projects, featured: es_featured, addActivity: es_addActivity, goals: es_goals, quests: es_quests, quickCapture: es_quickCapture },
  ht: { common: ht_common, tabs: ht_tabs, feed: ht_feed, settings: ht_settings, paywall: ht_paywall, profile: ht_profile, notifications: ht_notifications, discover: ht_discover, stories: ht_stories, messaging: ht_messaging, ai: ht_ai, onboarding: ht_onboarding, auth: ht_auth, dashboard: ht_dashboard, capacities: ht_capacities, hero: ht_hero, danger: ht_danger, projects: ht_projects, featured: ht_featured, addActivity: ht_addActivity, goals: ht_goals, quests: ht_quests, quickCapture: ht_quickCapture },
};
