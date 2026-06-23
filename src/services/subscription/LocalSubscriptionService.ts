/**
 * Default when billing isn't configured: no real charges. Reports the free state
 * and refuses purchases honestly (never throws into the UI). The
 * SubscriptionContext layers a dev/settings override on top for previewing Plus.
 */
import { FREE_STATE, type PurchaseResult, type SubscriptionService, type SubscriptionState } from './SubscriptionService';

export class LocalSubscriptionService implements SubscriptionService {
  readonly isReal = false;

  async getState(): Promise<SubscriptionState> {
    return { ...FREE_STATE };
  }

  async purchase(_sku: string): Promise<PurchaseResult> {
    return { ok: false, reason: 'unavailable', state: { ...FREE_STATE } };
  }

  async restore(): Promise<PurchaseResult> {
    return { ok: false, reason: 'unavailable', state: { ...FREE_STATE } };
  }
}
