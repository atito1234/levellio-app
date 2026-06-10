import { PLAN_CONFIG, getPlan } from './plans';

describe('plan config', () => {
  it('has exactly a free and a premium plan', () => {
    expect(PLAN_CONFIG.plans.map((p) => p.id).sort()).toEqual(['free', 'premium']);
  });

  it('keeps the free plan free forever', () => {
    const free = getPlan('free');
    expect(free.price.amount).toBe(0);
    expect(free.price.period).toBe('forever');
    expect(free.features.length).toBeGreaterThanOrEqual(4);
  });

  it('does NOT hardcode a final premium price (tunable in v2)', () => {
    const premium = getPlan('premium');
    expect(premium.price.amount).toBeNull();
    expect(premium.price.label.length).toBeGreaterThan(0);
  });

  it('every plan has display copy and a CTA', () => {
    for (const plan of PLAN_CONFIG.plans) {
      expect(plan.name.length).toBeGreaterThan(0);
      expect(plan.tagline.length).toBeGreaterThan(0);
      expect(plan.ctaLabel.length).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('includes an honest disclosure', () => {
    expect(PLAN_CONFIG.disclosure.toLowerCase()).toContain('free');
  });
});
