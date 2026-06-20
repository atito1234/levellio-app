import { NAMESPACES, DEFAULT_LOCALE } from './config';
import { resources } from './resources';

// Locales we require to be complete. Haitian Creole ('ht') is experimental and
// intentionally left partial for now — missing keys fall back to English at runtime.
const COMPLETE_LOCALES = ['en', 'fr', 'es'] as const;

/** Flatten a nested object into dot-path keys, e.g. "action.cancel". */
function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' ? keyPaths(v, prefix ? `${prefix}.${k}` : k) : [prefix ? `${prefix}.${k}` : k],
    );
  }
  return [];
}

function values(obj: unknown): string[] {
  if (typeof obj === 'string') return [obj];
  if (obj && typeof obj === 'object') return Object.values(obj).flatMap(values);
  return [];
}

describe('locale resources', () => {
  const nonDefault = COMPLETE_LOCALES.filter((l) => l !== DEFAULT_LOCALE);

  it.each(NAMESPACES)('every complete locale (en/fr/es) matches the English key set for "%s"', (ns) => {
    const expected = keyPaths(resources[DEFAULT_LOCALE][ns]).sort();
    for (const locale of nonDefault) {
      const actual = keyPaths(resources[locale][ns]).sort();
      expect({ locale, ns, keys: actual }).toEqual({ locale, ns, keys: expected });
    }
  });

  it('has no empty string values in the complete locales', () => {
    for (const locale of COMPLETE_LOCALES) {
      for (const ns of NAMESPACES) {
        for (const v of values(resources[locale][ns])) {
          expect(v.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
