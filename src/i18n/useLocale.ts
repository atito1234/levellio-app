/**
 * Thin hook over settings + i18next for the language switcher. Reading the active
 * language from i18next keeps it in sync with whatever SettingsContext resolved
 * (including the "system" → concrete-locale fallback).
 */
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/state/SettingsContext';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type LocaleSetting,
  type SupportedLocale,
} from './config';

export function useLocale(): {
  /** The user's stored preference ('system' or an explicit locale). */
  setting: LocaleSetting;
  /** The concrete locale currently rendering. */
  active: SupportedLocale;
  /** Persist a new preference; SettingsContext applies it to i18next. */
  setLocale: (next: LocaleSetting) => Promise<void>;
} {
  const { settings, update } = useSettings();
  const { i18n } = useTranslation();
  const active = isSupportedLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
  return {
    setting: settings.locale,
    active,
    setLocale: (next) => update({ locale: next }),
  };
}
