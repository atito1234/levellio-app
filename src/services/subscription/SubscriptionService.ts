/**
 * Subscription seam. A single abstraction over "what is the user entitled to and
 * how do they pay" so the app can ship a no-op (free) implementation today and
 * swap in real billing (RevenueCat) later with no UI rework — exactly how the
 * community/projects backends are structured.
 *
 * Honesty: while billing isn't configured, `purchase`/`restore` never initiate a
 * charge and never throw into the UI; they resolve to an honest "unavailable".
 */
import type { Entitlements } from '@/services/monetization';

export type PurchaseFailReason = 'unavailable' | 'cancelled' | 'error';

/** Lifecycle of the user's Plus subscription. */
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'expired';

export interface SubscriptionState {
  status: SubscriptionStatus;
  /** Store product id of the active/most-recent plan (e.g. 'plus_annual'). */
  sku?: string;
  /** Epoch ms the free trial converts to paid (only while `trialing`). */
  trialEndsAt?: number;
  /** Epoch ms the current period renews/expires. */
  renewsAt?: number;
}

/** The free, nothing-purchased state. */
export const FREE_STATE: SubscriptionState = { status: 'free' };

/** Plus is unlocked while trialing or active. */
export function isPremiumState(s: SubscriptionState): boolean {
  return s.status === 'trialing' || s.status === 'active';
}

/** Derive the gate entitlement from a subscription state. */
export function entitlementsFromState(s: SubscriptionState): Entitlements {
  return { isPremium: isPremiumState(s) };
}

export interface PurchaseResult {
  ok: boolean;
  /** Why a purchase didn't complete. */
  reason?: PurchaseFailReason;
  /** The resulting state when the purchase/restore succeeded. */
  state?: SubscriptionState;
}

export interface SubscriptionService {
  /** True only for a real, billing-backed implementation. */
  readonly isReal: boolean;
  /** The user's current subscription state (anonymous allowed). */
  getState(uid?: string): Promise<SubscriptionState>;
  /** Begin a purchase of a specific store product (sku). */
  purchase(sku: string): Promise<PurchaseResult>;
  /** Restore previously purchased entitlements. */
  restore(): Promise<PurchaseResult>;
}

/** The free, nothing-purchased entitlement. */
export const NO_ENTITLEMENT: Entitlements = { isPremium: false };
