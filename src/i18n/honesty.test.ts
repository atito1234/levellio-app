import { findForbiddenInAllLocales, FORBIDDEN_BY_LOCALE, honestyStringsFor } from './honesty';
import { SUPPORTED_LOCALES } from './config';

describe('localized copy honesty', () => {
  it('contains no forbidden over-claims in any locale', () => {
    expect(findForbiddenInAllLocales()).toEqual([]);
  });

  it('defines a per-locale forbidden list for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(FORBIDDEN_BY_LOCALE[locale]).toBeDefined();
    }
  });

  it('frames the paywall as a coming-soon / beta state in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const blob = honestyStringsFor(locale).join(' ').toLowerCase();
      expect(blob).toMatch(/beta|bêta|bèta|coming soon|bient[oô]t|pr[oó]xima|byento/);
    }
  });
});
