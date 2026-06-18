/**
 * The single chokepoint that gates the whole community layer (newsfeed, posting,
 * comments, reactions, networks). It's OPEN for the free launch, but reads the
 * premium entitlement so a payment gateway can flip it to paid later with zero
 * UI rework — every community surface already checks this hook.
 */
import { useSettings } from '@/state/SettingsContext';

/** Flip to false to require payment for community features. */
export const COMMUNITY_FREE_LAUNCH = true;

export function useCommunityAccess(): boolean {
  const { settings } = useSettings();
  return COMMUNITY_FREE_LAUNCH || settings.isPremium;
}
