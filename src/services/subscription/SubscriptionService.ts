/**
 * Subscription seam. A single abstraction over "what is the user entitled to and
 * how do they pay" so the alpha can ship a no-op (free) implementation today and
 * swap in a real billing backend (RevenueCat) later with no UI rework — exactly
 * how the community/projects backends are structured.
 *
 * Honesty: while monetization is disabled, `purchase`/`restore` never initiate a
 * charge and never throw into the UI; they resolve to an honest "unavailable".
 */
import type { Entitlements, PlanId } from '@/services/monetization';

export type PurchaseFailReason = 'unavailable' | 'cancelled' | 'error';

export interface PurchaseResult {
  ok: boolean;
  /** Why a purchase didn't complete. Alpha: always 'unavailable'. */
  reason?: PurchaseFailReason;
  entitlements?: Entitlements;
}

export interface SubscriptionService {
  /** True only for a real, billing-backed implementation. */
  readonly isReal: boolean;
  /** The user's current entitlement (anonymous allowed). */
  getEntitlement(uid?: string): Promise<Entitlements>;
  /** Begin a purchase. Honest no-op while monetization is disabled. */
  purchase(planId: PlanId): Promise<PurchaseResult>;
  /** Restore previously purchased entitlements. */
  restore(): Promise<PurchaseResult>;
}

/** The free, nothing-purchased entitlement. */
export const NO_ENTITLEMENT: Entitlements = { isPremium: false };
