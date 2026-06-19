/**
 * i18n configuration — the single source of truth for which languages Levellio
 * supports and how locale namespaces are organized. Kept dependency-free (no
 * imports from settings/state) so both the app runtime and unit tests can use it
 * without pulling in React Native.
 *
 * Translation status: `en` is the human-authored source of truth. `fr`/`es` are
 * machine drafts pending review; `ht` (Haitian Creole) is a machine draft flagged
 * for human verification before any Creole-targeted launch.
 */

/** Languages we ship strings for. `en` is always complete (source of truth). */
export const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'ht'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** A user's stored preference: an explicit language or "follow the device". */
export type LocaleSetting = 'system' | SupportedLocale;

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Namespaces (one JSON file per area, per locale). Add new areas here. */
export const NAMESPACES = ['common', 'tabs', 'feed', 'settings', 'paywall', 'profile', 'notifications', 'discover', 'stories'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Translation maturity, surfaced in the language picker so testers know. */
export const LOCALE_STATUS: Record<SupportedLocale, 'stable' | 'draft'> = {
  en: 'stable',
  fr: 'draft',
  es: 'draft',
  ht: 'draft',
};

/** Native-name labels for the language switcher. */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  ht: 'Kreyòl Ayisyen',
};

/** Type guard: is an arbitrary string one of our supported locales? */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a stored setting + raw device locale (e.g. "fr-FR") into a concrete
 * supported locale we have strings for. Falls back to English.
 */
export function resolveLocale(setting: LocaleSetting, deviceLocale?: string | null): SupportedLocale {
  if (setting !== 'system') return setting;
  const base = (deviceLocale ?? '').toLowerCase().split('-')[0];
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}
