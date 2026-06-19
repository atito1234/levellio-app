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

import fr_common from './locales/fr/common.json';
import fr_tabs from './locales/fr/tabs.json';
import fr_feed from './locales/fr/feed.json';
import fr_settings from './locales/fr/settings.json';
import fr_paywall from './locales/fr/paywall.json';

import es_common from './locales/es/common.json';
import es_tabs from './locales/es/tabs.json';
import es_feed from './locales/es/feed.json';
import es_settings from './locales/es/settings.json';
import es_paywall from './locales/es/paywall.json';

import ht_common from './locales/ht/common.json';
import ht_tabs from './locales/ht/tabs.json';
import ht_feed from './locales/ht/feed.json';
import ht_settings from './locales/ht/settings.json';
import ht_paywall from './locales/ht/paywall.json';

export type ResourceBundle = Record<Namespace, Record<string, unknown>>;

export const resources: Record<SupportedLocale, ResourceBundle> = {
  en: { common: en_common, tabs: en_tabs, feed: en_feed, settings: en_settings, paywall: en_paywall },
  fr: { common: fr_common, tabs: fr_tabs, feed: fr_feed, settings: fr_settings, paywall: fr_paywall },
  es: { common: es_common, tabs: es_tabs, feed: es_feed, settings: es_settings, paywall: es_paywall },
  ht: { common: ht_common, tabs: ht_tabs, feed: ht_feed, settings: ht_settings, paywall: ht_paywall },
};
