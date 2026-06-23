/**
 * RevenueCat configuration, read from public Expo env vars (not secrets — these
 * are publishable SDK keys). Billing stays OFF until at least one key is present,
 * so the app runs free/offline with no billing dependency. Intentionally free of
 * any `react-native` import so pure unit tests can resolve it without RN.
 */

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const PLUS_ENTITLEMENT_ID = 'plus';

const iosKey = (): string => process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const androidKey = (): string => process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

/** Publishable API key for the given platform, or null when unset. */
export function revenueCatApiKey(platformOS: string): string | null {
  const ios = iosKey();
  const android = androidKey();
  const key = platformOS === 'android' ? android || ios : ios || android;
  return key.length > 0 ? key : null;
}

/** True when RevenueCat is configured (a key exists) — gates real billing. */
export function isRevenueCatConfigured(): boolean {
  return (iosKey() || androidKey()).length > 0;
}
