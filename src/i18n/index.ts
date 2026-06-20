/**
 * i18next bootstrap. Initialized once, synchronously, from the bundled resources
 * so the first render already has strings. The active language is driven by the
 * user's settings (see SettingsContext), which calls `setI18nLanguage`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, NAMESPACES, type SupportedLocale } from './config';
import { resources } from './resources';

export * from './config';
export { resources } from './resources';

let initialized = false;

/** Initialize i18next exactly once. Safe to call from multiple entry points. */
export function initI18n(initialLocale: SupportedLocale = DEFAULT_LOCALE) {
  if (initialized) return i18n;
  initialized = true;
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    ns: NAMESPACES as unknown as string[],
    defaultNS: 'common',
    returnNull: false,
    // Blank values (e.g. experimental Haitian Creole) fall back to English.
    returnEmptyString: false,
    interpolation: { escapeValue: false }, // React already escapes
  });
  return i18n;
}

/** Switch the active language at runtime (no-op if already initialized to it). */
export function setI18nLanguage(locale: SupportedLocale) {
  if (!initialized) initI18n(locale);
  if (i18n.language !== locale) void i18n.changeLanguage(locale);
}

export default i18n;
