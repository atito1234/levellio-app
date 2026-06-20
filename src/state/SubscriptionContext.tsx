import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSubscriptionService } from '@/services/subscription';
import type { Entitlements } from '@/services/monetization';
import { FOUNDING_FREE } from '@/config/features';
import { useSettings } from '@/state/SettingsContext';
import { useAuth } from '@/state/AuthContext';

/**
 * The single source of truth for the premium entitlement. Resolves from the
 * SubscriptionService (Local/no-op during the alpha) with the local
 * `settings.isPremium` flag as a dev/local override. Every premium gate
 * (e.g. useCommunityAccess) reads from here, so switching to real billing later
 * needs no UI changes.
 */
interface SubscriptionContextValue {
  entitlements: Entitlements;
  /** True only when a real billing backend is active. */
  isReal: boolean;
  /** True while everyone gets Plus free as a founding member (the beta). */
  isFounding: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { account } = useAuth();
  const service = getSubscriptionService();
  const [servicePremium, setServicePremium] = useState(false);

  useEffect(() => {
    let active = true;
    service
      .getEntitlement(account?.uid)
      .then((e) => {
        if (active) setServicePremium(e.isPremium);
      })
      .catch(() => {
        if (active) setServicePremium(false);
      });
    return () => {
      active = false;
    };
  }, [service, account?.uid]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      // Founding members get Plus free during the beta; otherwise resolve from the
      // subscription service, with the local settings flag as a dev override.
      entitlements: { isPremium: FOUNDING_FREE || servicePremium || settings.isPremium },
      isReal: service.isReal,
      isFounding: FOUNDING_FREE,
    }),
    [servicePremium, settings.isPremium, service.isReal],
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
