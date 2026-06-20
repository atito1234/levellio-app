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

export const PREMIUM_FEATURES = [
  'cosmetics',
  'plus-badge',
  // Reserved for upcoming Plus perks (not yet listed in user-facing copy):
  'advanced-insights',
  'projects-unlimited',
  'ai-coach',
  'cloud-ai-managed',
  'cloud-sync',
] as const;

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
export const canUsePlusBadge = (e: Entitlements): boolean => canUse('plus-badge', e);
export const canUseAdvancedInsights = (e: Entitlements): boolean => canUse('advanced-insights', e);
export const canUseAiCoach = (e: Entitlements): boolean => canUse('ai-coach', e);
export const canUseProjectsUnlimited = (e: Entitlements): boolean => canUse('projects-unlimited', e);
