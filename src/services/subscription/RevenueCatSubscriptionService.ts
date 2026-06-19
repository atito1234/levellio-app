/**
 * Placeholder for the future RevenueCat-backed implementation (post-alpha). It is
 * intentionally NOT wired in yet — no `react-native-purchases` dependency is
 * installed during the free alpha. Kept here so the seam is explicit and turning
 * on real billing later is a one-line swap in `index.ts` (plus the SDK install +
 * a server-side entitlement webhook writing to the user's Account).
 */
import type { Entitlements } from '@/services/monetization';
import type { PurchaseResult, SubscriptionService } from './SubscriptionService';

export class RevenueCatSubscriptionService implements SubscriptionService {
  readonly isReal = true;

  private notConfigured(): never {
    throw new Error('RevenueCatSubscriptionService is not configured yet — the alpha is free.');
  }

  async getEntitlement(): Promise<Entitlements> {
    return this.notConfigured();
  }

  async purchase(): Promise<PurchaseResult> {
    return this.notConfigured();
  }

  async restore(): Promise<PurchaseResult> {
    return this.notConfigured();
  }
}
