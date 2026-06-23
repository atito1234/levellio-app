/**
 * Selects the active subscription service: RevenueCat when a publishable key is
 * configured (real billing, dev build), otherwise the local no-op (free). Loaded
 * lazily so the no-billing path never imports the native SDK.
 */
import { LocalSubscriptionService } from './LocalSubscriptionService';
import { isRevenueCatConfigured } from './config';
import type { SubscriptionService } from './SubscriptionService';

let instance: SubscriptionService | null = null;

export function getSubscriptionService(): SubscriptionService {
  if (!instance) {
    if (isRevenueCatConfigured()) {
      const { RevenueCatSubscriptionService } = require('./RevenueCatSubscriptionService');
      instance = new RevenueCatSubscriptionService();
    } else {
      instance = new LocalSubscriptionService();
    }
  }
  return instance!;
}

export { NO_ENTITLEMENT, FREE_STATE, isPremiumState, entitlementsFromState } from './SubscriptionService';
export type {
  SubscriptionService,
  SubscriptionState,
  SubscriptionStatus,
  PurchaseResult,
  PurchaseFailReason,
} from './SubscriptionService';
export { isRevenueCatConfigured, PLUS_ENTITLEMENT_ID } from './config';
