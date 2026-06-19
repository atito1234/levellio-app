import { NAMESPACES, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './config';
import { resources } from './resources';

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
  const nonDefault = SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE);

  it.each(NAMESPACES)('every locale has the same key set as English for "%s"', (ns) => {
    const expected = keyPaths(resources[DEFAULT_LOCALE][ns]).sort();
    for (const locale of nonDefault) {
      const actual = keyPaths(resources[locale][ns]).sort();
      expect({ locale, ns, keys: actual }).toEqual({ locale, ns, keys: expected });
    }
  });

  it('has no empty string values in any locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const ns of NAMESPACES) {
        for (const v of values(resources[locale][ns])) {
          expect(v.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
