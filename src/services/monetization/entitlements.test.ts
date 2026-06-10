import {
  canUse,
  isPremiumFeature,
  canUseManagedCloudAI,
  canUseCosmetics,
  canUseCloudSync,
  FREE_FEATURES,
  PREMIUM_FEATURES,
} from './entitlements';

const free = { isPremium: false };
const premium = { isPremium: true };

describe('entitlement gating', () => {
  it('never gates free features, regardless of premium state', () => {
    for (const feature of FREE_FEATURES) {
      expect(canUse(feature, free)).toBe(true);
      expect(canUse(feature, premium)).toBe(true);
    }
  });

  it('gates premium features when not premium', () => {
    for (const feature of PREMIUM_FEATURES) {
      expect(canUse(feature, free)).toBe(false);
      expect(canUse(feature, premium)).toBe(true);
    }
  });

  it('classifies features correctly', () => {
    expect(isPremiumFeature('cosmetics')).toBe(true);
    expect(isPremiumFeature('on-device-ai')).toBe(false);
  });

  it('exposes convenience helpers', () => {
    expect(canUseManagedCloudAI(free)).toBe(false);
    expect(canUseCosmetics(premium)).toBe(true);
    expect(canUseCloudSync(free)).toBe(false);
    expect(canUseCloudSync(premium)).toBe(true);
  });

  it('keeps free and premium feature sets disjoint', () => {
    const overlap = (FREE_FEATURES as readonly string[]).filter((f) =>
      (PREMIUM_FEATURES as readonly string[]).includes(f),
    );
    expect(overlap).toEqual([]);
  });
});
