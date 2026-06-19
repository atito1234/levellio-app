/**
 * Alpha default: no billing at all. Always reports the free entitlement and
 * refuses purchases honestly (never throws into the UI). The SubscriptionContext
 * layers a settings-backed dev override on top, so this stays a pure no-op.
 */
import type { Entitlements, PlanId } from '@/services/monetization';
import { NO_ENTITLEMENT, type PurchaseResult, type SubscriptionService } from './SubscriptionService';

export class LocalSubscriptionService implements SubscriptionService {
  readonly isReal = false;

  async getEntitlement(): Promise<Entitlements> {
    return { ...NO_ENTITLEMENT };
  }

  async purchase(_planId: PlanId): Promise<PurchaseResult> {
    return { ok: false, reason: 'unavailable', entitlements: { ...NO_ENTITLEMENT } };
  }

  async restore(): Promise<PurchaseResult> {
    return { ok: false, reason: 'unavailable', entitlements: { ...NO_ENTITLEMENT } };
  }
}
