/**
 * Real billing backed by RevenueCat. Code-complete; activates only when a
 * publishable key is configured (see config.ts) AND `react-native-purchases` is
 * installed in a custom dev build. The SDK is loaded lazily via require() so the
 * app bundles and tests run without the native dependency until go-live.
 *
 * Maps the `plus` entitlement to our SubscriptionState: a trial period →
 * 'trialing' (with trialEndsAt), an active paid period → 'active', otherwise
 * 'free'. Purchases go through RevenueCat offerings keyed by sku (store product id).
 */
import { Platform } from 'react-native';
import {
  FREE_STATE,
  type PurchaseResult,
  type SubscriptionService,
  type SubscriptionState,
} from './SubscriptionService';
import { PLUS_ENTITLEMENT_ID, revenueCatApiKey } from './config';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class RevenueCatSubscriptionService implements SubscriptionService {
  readonly isReal = true;
  private purchases: any | null = null;
  private configured = false;

  /** Lazy-load + configure the SDK exactly once. */
  private async sdk(): Promise<any> {
    if (!this.purchases) {
      // GO-LIVE: `npx expo install react-native-purchases` (needs a custom dev
      // build — not Expo Go), then enable the require below. It's intentionally
      // disabled so Metro doesn't try to resolve the native module before install.
      // this.purchases = require('react-native-purchases').default;
      if (!this.purchases) throw new Error('react-native-purchases is not installed yet');
    }
    if (!this.configured) {
      const apiKey = revenueCatApiKey(Platform.OS);
      if (!apiKey) throw new Error('RevenueCat API key missing');
      this.purchases.configure({ apiKey });
      this.configured = true;
    }
    return this.purchases;
  }

  async getState(uid?: string): Promise<SubscriptionState> {
    try {
      const Purchases = await this.sdk();
      if (uid) {
        try {
          await Purchases.logIn(uid);
        } catch {
          /* anonymous is fine */
        }
      }
      const info = await Purchases.getCustomerInfo();
      return mapState(info);
    } catch {
      return { ...FREE_STATE };
    }
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    try {
      const Purchases = await this.sdk();
      const offerings = await Purchases.getOfferings();
      const pkg = findPackage(offerings, sku);
      if (!pkg) return { ok: false, reason: 'unavailable' };
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const state = mapState(customerInfo);
      return { ok: isActive(state), state };
    } catch (e: any) {
      if (e?.userCancelled) return { ok: false, reason: 'cancelled' };
      return { ok: false, reason: 'error' };
    }
  }

  async restore(): Promise<PurchaseResult> {
    try {
      const Purchases = await this.sdk();
      const info = await Purchases.restorePurchases();
      const state = mapState(info);
      return { ok: isActive(state), state };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }
}

function isActive(s: SubscriptionState): boolean {
  return s.status === 'active' || s.status === 'trialing';
}

/** Find the offering package whose store product id matches `sku`. */
function findPackage(offerings: any, sku: string): any | null {
  const all: any[] = offerings?.current?.availablePackages ?? [];
  return all.find((p) => p?.product?.identifier === sku) ?? null;
}

/** Map a RevenueCat CustomerInfo into our SubscriptionState. */
function mapState(info: any): SubscriptionState {
  const ent = info?.entitlements?.active?.[PLUS_ENTITLEMENT_ID];
  if (!ent) return { ...FREE_STATE };
  const expires = ent.expirationDate ? Date.parse(ent.expirationDate) : undefined;
  const trialing = ent.periodType === 'trial' || ent.periodType === 'TRIAL';
  return {
    status: trialing ? 'trialing' : 'active',
    sku: ent.productIdentifier,
    ...(expires ? (trialing ? { trialEndsAt: expires } : { renewsAt: expires }) : {}),
  };
}
