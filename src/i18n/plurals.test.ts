/**
 * Guards i18next pluralization end-to-end through the REAL init options. The app
 * uses v4 plural keys (`_one`/`_other`); a misconfig (e.g. compatibilityJSON 'v3')
 * makes them render as raw keys. These assert real plural keys resolve to copy —
 * not the raw key — across en/es/fr. (A plain default-config instance would NOT
 * have caught the historical `battle.summary` / `verdict.building.reason` bugs.)
 */
import i18n, { initI18n } from './index';

beforeAll(() => {
  initI18n('en');
});

const NON_RAW = (s: string, key: string) => {
  expect(typeof s).toBe('string');
  expect(s).not.toContain(key);
  expect(s.length).toBeGreaterThan(0);
};

describe('i18n pluralization (real config)', () => {
  it('resolves battle.summary for singular and plural counts', () => {
    NON_RAW(i18n.t('battle:battle.summary', { count: 1, completed: 1, selected: 1, xp: '' }), 'battle.summary');
    NON_RAW(i18n.t('battle:battle.summary', { count: 3, completed: 2, selected: 3, xp: '' }), 'battle.summary');
  });

  it('resolves momentum confidence plurals', () => {
    NON_RAW(i18n.t('momentum:confidence.early', { count: 1 }), 'confidence.early');
    NON_RAW(i18n.t('momentum:confidence.building', { count: 5 }), 'confidence.building');
  });

  it('resolves plural keys in es and fr too', async () => {
    for (const lng of ['es', 'fr']) {
      await i18n.changeLanguage(lng);
      NON_RAW(i18n.t('battle:battle.summary', { count: 2, completed: 1, selected: 2, xp: '' }), 'battle.summary');
    }
    await i18n.changeLanguage('en');
  });
});
