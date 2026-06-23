/**
 * In-onboarding App Store / Play rating prompt (the Cal AI tactic that yields a
 * 4.8★ rating: ask happy new users to rate before the paywall). No-ops until
 * `expo-store-review` is installed, so the flow never blocks.
 *
 * GO-LIVE: `npx expo install expo-store-review`, then enable the block below.
 */
export async function requestAppReview(): Promise<void> {
  try {
    // const StoreReview = require('expo-store-review');
    // if (await StoreReview.isAvailableAsync()) {
    //   await StoreReview.requestReview();
    // }
  } catch {
    // module absent / unsupported — silently skip.
  }
}
