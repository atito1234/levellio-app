/**
 * Selects the active subscription service. The alpha uses the Local (no-billing)
 * implementation; flipping to RevenueCat later is a one-line change here, behind
 * MONETIZATION_ENABLED.
 */
import { LocalSubscriptionService } from './LocalSubscriptionService';
import type { SubscriptionService } from './SubscriptionService';

let instance: SubscriptionService | null = null;

export function getSubscriptionService(): SubscriptionService {
  if (!instance) instance = new LocalSubscriptionService();
  return instance;
}

export { NO_ENTITLEMENT } from './SubscriptionService';
export type { SubscriptionService, PurchaseResult, PurchaseFailReason } from './SubscriptionService';
