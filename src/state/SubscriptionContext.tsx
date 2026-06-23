import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getSubscriptionService,
  isPremiumState,
  FREE_STATE,
  type SubscriptionState,
  type PurchaseResult,
} from '@/services/subscription';
import type { Entitlements } from '@/services/monetization';
import { FOUNDING_FREE } from '@/config/features';
import { useSettings } from '@/state/SettingsContext';
import { useAuth } from '@/state/AuthContext';
import { syncTrialReminder } from '@/services/subscription/trialReminder';

/**
 * Single source of truth for the premium entitlement + subscription lifecycle.
 * Resolves from the SubscriptionService (RevenueCat when configured, else a free
 * no-op), with `FOUNDING_FREE` and a local `settings.isPremium` dev override on
 * top. Every gate reads `isPremium` from here, so flipping on real billing needs
 * no UI changes.
 */
interface SubscriptionContextValue {
  entitlements: Entitlements;
  /** The full lifecycle state (free / trialing / active / expired). */
  subscription: SubscriptionState;
  /** True only when a real billing backend is active. */
  isReal: boolean;
  /** True while everyone gets Plus free as a founding member (the beta). */
  isFounding: boolean;
  /** Begin a purchase of a store product (sku). Refreshes state on success. */
  purchase: (sku: string) => Promise<PurchaseResult>;
  /** Restore previously purchased entitlements. */
  restore: () => Promise<PurchaseResult>;
  /** Re-read the current state from the billing backend. */
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { account } = useAuth();
  const service = getSubscriptionService();
  const [state, setState] = useState<SubscriptionState>(FREE_STATE);

  const load = useCallback(async () => {
    try {
      const next = await service.getState(account?.uid);
      setState(next);
    } catch {
      setState(FREE_STATE);
    }
  }, [service, account?.uid]);

  useEffect(() => {
    let active = true;
    void service
      .getState(account?.uid)
      .then((next) => active && setState(next))
      .catch(() => active && setState(FREE_STATE));
    return () => {
      active = false;
    };
  }, [service, account?.uid]);

  // Keep the local "remind me before the trial converts" notification in sync.
  useEffect(() => {
    void syncTrialReminder(state);
  }, [state]);

  const purchase = useCallback(
    async (sku: string) => {
      const result = await service.purchase(sku);
      if (result.ok && result.state) setState(result.state);
      return result;
    },
    [service],
  );

  const restore = useCallback(
    async () => {
      const result = await service.restore();
      if (result.ok && result.state) setState(result.state);
      return result;
    },
    [service],
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      // Founding members get Plus free during the beta; otherwise it's unlocked by
      // a trial/active subscription, with the local settings flag as a dev override.
      entitlements: { isPremium: FOUNDING_FREE || isPremiumState(state) || settings.isPremium },
      subscription: state,
      isReal: service.isReal,
      isFounding: FOUNDING_FREE,
      purchase,
      restore,
      refresh: load,
    }),
    [state, settings.isPremium, service.isReal, purchase, restore, load],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useEntitlements(): Entitlements {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useEntitlements must be used within a SubscriptionProvider');
  return ctx.entitlements;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return ctx;
}
