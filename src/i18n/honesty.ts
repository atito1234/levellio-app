/**
 * Extends the honesty gate (src/content/uiCopy.ts) to cover translated copy.
 * Machine translation can silently reintroduce a claim we don't ship, so we scan
 * every locale's honesty-sensitive namespaces — using both the English forbidden
 * list and a small per-locale list of the worst over-claims.
 */
import { FORBIDDEN_USER_FACING } from '@/content/uiCopy';
import { SUPPORTED_LOCALES, type SupportedLocale } from './config';
import { resources } from './resources';

/** Namespaces whose copy must never over-claim an unshipped feature. */
export const HONESTY_NAMESPACES = ['paywall', 'settings', 'ai'] as const;

/** Per-locale translations of the key over-claims, so they can't sneak back in. */
export const FORBIDDEN_BY_LOCALE: Record<SupportedLocale, readonly string[]> = {
  en: [],
  fr: ['classement', 'synchronisation cloud', 'entraînement'],
  es: ['clasificación', 'sincronización en la nube', 'entrenamiento'],
  ht: ['klasman', 'senkronizasyon nway', 'antrènman'],
};

/** Recursively collect every string value in a nested object. */
function flattenStrings(obj: unknown, out: string[]): void {
  if (typeof obj === 'string') out.push(obj);
  else if (obj && typeof obj === 'object') for (const v of Object.values(obj)) flattenStrings(v, out);
}

/** All honesty-sensitive strings for one locale. */
export function honestyStringsFor(locale: SupportedLocale): string[] {
  const out: string[] = [];
  for (const ns of HONESTY_NAMESPACES) flattenStrings(resources[locale][ns], out);
  return out;
}

/** Scan every locale; returns "locale :: phrase :: text" hits (empty = clean). */
export function findForbiddenInAllLocales(): string[] {
  const hits: string[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    const phrases = [...FORBIDDEN_USER_FACING, ...FORBIDDEN_BY_LOCALE[locale]];
    const texts = honestyStringsFor(locale);
    for (const text of texts) {
      const lower = text.toLowerCase();
      for (const phrase of phrases) {
        if (lower.includes(phrase.toLowerCase())) hits.push(`${locale} :: ${phrase} :: ${text}`);
      }
    }
  }
  return hits;
}
