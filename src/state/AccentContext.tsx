import React, { createContext, useContext, useMemo } from 'react';
import { getTheme } from '@/data/cosmetics';
import { colors } from '@/theme';
import { canUseCosmetics } from '@/services/monetization';
import { useSettings } from '@/state/SettingsContext';
import { useEntitlements } from '@/state/SubscriptionContext';

/**
 * The active accent color — the user's chosen cosmetic theme when they're entitled
 * (Plus / founding member), otherwise the classic violet. Defaults to violet with
 * no provider so components (e.g. PrimaryButton) render fine in isolation/tests.
 */
const AccentContext = createContext<string>(colors.identity);

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const entitlements = useEntitlements();
  const accent = useMemo(() => {
    const theme = getTheme(settings.cosmeticThemeId);
    if (theme.premium && !canUseCosmetics(entitlements)) return colors.identity;
    return theme.accent;
  }, [settings.cosmeticThemeId, entitlements]);

  return <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>;
}

export function useAccent(): string {
  return useContext(AccentContext);
}
