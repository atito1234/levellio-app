/**
 * "Start over" — a full, destructive local reset for testers and anyone who
 * wants to re-experience the first-run flow.
 *
 * Why a storage wipe + reload (instead of resetting each context in place):
 * ~17 contexts/stores each load once on mount from the device. Clearing the
 * app's `levellio:` namespace and reloading the JS bundle re-bootstraps every
 * provider from an empty store — the exact "brand new user" state — in one
 * code path. With no character and `onboardingCompleted` back to its default
 * (false), RootNavigator routes to the Onboarding funnel, and the welcome tour
 * then auto-fires afterward.
 *
 * This does NOT delete the cloud account (see AuthContext.deleteAccount for
 * that). It only clears local state so onboarding runs again.
 */
import { DevSettings } from 'react-native';
import { AsyncStorageStore } from '@/services/storage';
import { clearByoApiKey } from '@/services/security/secureKeyStore';

/** Namespace prefix every app storage key shares (e.g. `levellio:settings`). */
const APP_NAMESPACE = 'levellio:';

/** Wipe all locally persisted app data (game, quests, goals, settings, BYO key). */
export async function resetAppData(): Promise<void> {
  await new AsyncStorageStore().clear(APP_NAMESPACE);
  // Secrets live in the secure store, not AsyncStorage — clear separately.
  await clearByoApiKey();
}

/** Reload the JS bundle so every provider re-bootstraps from the cleared store. */
export function reloadApp(): void {
  DevSettings.reload();
}
