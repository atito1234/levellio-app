/**
 * Guards that the localized English paywall copy never drifts from the
 * honesty-gated PLAN_CONFIG (the structural source of truth, covered by
 * plans.test.ts). The cross-locale forbidden-phrase scan (honesty.test.ts)
 * covers FR/ES/HT; this keeps EN truthful to the config.
 */
import en from './locales/en/paywall.json';
import { PLAN_CONFIG, getPlan } from '@/services/monetization';

describe('EN paywall copy matches the honesty-gated config', () => {
  it('free features match PLAN_CONFIG', () => {
    expect(en.freeFeatures).toEqual(getPlan('free').features);
  });

  it('free tagline matches PLAN_CONFIG', () => {
    expect(en.freeTagline).toBe(getPlan('free').tagline);
  });

  it('disclosure and beta notice match PLAN_CONFIG', () => {
    expect(en.disclosure).toBe(PLAN_CONFIG.disclosure);
    expect(en.betaNotice).toBe(PLAN_CONFIG.betaNotice);
  });
});
