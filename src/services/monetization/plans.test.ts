import { PLAN_CONFIG, getPlan, MONETIZATION_ENABLED, canInitiatePurchase } from './plans';
import { FORBIDDEN_USER_FACING } from '@/content/uiCopy';

describe('plan config (v1.0 beta)', () => {
  it('has exactly a free and a premium plan', () => {
    expect(PLAN_CONFIG.plans.map((p) => p.id).sort()).toEqual(['free', 'premium']);
  });

  it('keeps the free plan free forever', () => {
    const free = getPlan('free');
    expect(free.price.amount).toBe(0);
    expect(free.price.period).toBe('forever');
    expect(free.features.length).toBeGreaterThanOrEqual(4);
  });

  it('lists real, shipped premium perks but is not purchasable in beta', () => {
    const premium = getPlan('premium');
    // Plus now advertises perks that actually ship (cosmetics, founder flair, impact).
    expect(premium.features.length).toBeGreaterThan(0);
    // ...but there is still no charge path during the founding beta.
    expect(premium.purchasable).toBe(false);
  });

  it('every plan has display copy', () => {
    for (const plan of PLAN_CONFIG.plans) {
      expect(plan.name.length).toBeGreaterThan(0);
      expect(plan.tagline.length).toBeGreaterThan(0);
      expect(plan.ctaLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('no charging path is reachable in v1.0', () => {
  it('monetization is disabled', () => {
    expect(MONETIZATION_ENABLED).toBe(false);
  });

  it('no plan is purchasable', () => {
    expect(PLAN_CONFIG.plans.every((p) => p.purchasable === false)).toBe(true);
  });

  it('canInitiatePurchase() is false', () => {
    expect(canInitiatePurchase()).toBe(false);
  });
});

describe('plan copy is honest (no unshipped-feature claims)', () => {
  const surfaces = [
    PLAN_CONFIG.disclosure,
    PLAN_CONFIG.betaNotice,
    ...PLAN_CONFIG.plans.flatMap((p) => [p.name, p.tagline, p.ctaLabel, p.price.label, ...p.features]),
  ];

  it('contains no forbidden phrases', () => {
    const lowerAll = surfaces.join(' \n ').toLowerCase();
    for (const phrase of FORBIDDEN_USER_FACING) {
      expect(lowerAll).not.toContain(phrase);
    }
  });

  it('keeps the true BYO-key / on-device AI messaging', () => {
    const free = getPlan('free').features.join(' ').toLowerCase();
    expect(free).toContain('on-device');
    expect(free).toContain('your key');
  });

  it('discloses the free-during-beta, no-charge stance', () => {
    expect(PLAN_CONFIG.disclosure.toLowerCase()).toContain('free');
    expect(PLAN_CONFIG.betaNotice.toLowerCase()).toMatch(/beta|nothing to buy|no payment/);
  });
});
