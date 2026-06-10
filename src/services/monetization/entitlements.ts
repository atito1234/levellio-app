/**
 * Entitlement gating. The free tier is generous: core features are ALWAYS
 * available. Premium only unlocks optional "delight multipliers". There is no
 * real billing — `isPremium` is a simple flag (default false).
 */
export const FREE_FEATURES = [
  'manual-creator',
  'habit-library',
  'streaks',
  'leveling',
  'on-device-ai',
] as const;

export const PREMIUM_FEATURES = ['cloud-ai-managed', 'cosmetics', 'cloud-sync'] as const;

export type FreeFeature = (typeof FREE_FEATURES)[number];
export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];
export type Feature = FreeFeature | PremiumFeature;

export interface Entitlements {
  isPremium: boolean;
}

export function isPremiumFeature(feature: Feature): boolean {
  return (PREMIUM_FEATURES as readonly string[]).includes(feature);
}

/** Whether a feature is available given the user's entitlements. */
export function canUse(feature: Feature, entitlements: Entitlements): boolean {
  if (!isPremiumFeature(feature)) return true; // free features are never gated
  return entitlements.isPremium;
}

export const canUseManagedCloudAI = (e: Entitlements): boolean => canUse('cloud-ai-managed', e);
export const canUseCosmetics = (e: Entitlements): boolean => canUse('cosmetics', e);
export const canUseCloudSync = (e: Entitlements): boolean => canUse('cloud-sync', e);
