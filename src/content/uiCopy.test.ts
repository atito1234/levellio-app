import {
  allUiCopyStrings,
  findForbiddenPhrases,
  FORBIDDEN_USER_FACING,
  PAYWALL_COPY,
  SETTINGS_COPY,
} from '@/content/uiCopy';

describe('user-facing copy honesty', () => {
  it('contains no forbidden unshipped-feature phrases', () => {
    expect(findForbiddenPhrases(allUiCopyStrings())).toEqual([]);
  });

  it('detects a forbidden phrase when present', () => {
    const hits = findForbiddenPhrases(['Enjoy free cloud sync today!']);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('forbids the key over-claims (cloud sync, accounts, managed AI, health, social)', () => {
    for (const p of ['cloud sync', 'managed cloud', 'sign in', 'health connect', 'workout']) {
      expect(FORBIDDEN_USER_FACING).toContain(p);
    }
  });

  it('frames the paywall as a coming-soon beta state', () => {
    expect(`${PAYWALL_COPY.kicker} ${PAYWALL_COPY.heading}`.toLowerCase()).toMatch(/beta|coming soon/);
  });

  it('keeps true on-device / BYO-key AI messaging in Settings', () => {
    const ai = `${SETTINGS_COPY.aiSectionNote} ${SETTINGS_COPY.aiOnDeviceHelp}`.toLowerCase();
    expect(ai).toContain('on-device');
    expect(ai).toContain('your own api key');
  });
});
