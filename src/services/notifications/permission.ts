/**
 * Requests OS notification permission for the onboarding "turn on reminders" step.
 * No-ops (returns false) until `expo-notifications` is installed, so the flow never
 * blocks. Pairs with the trial pre-charge reminder in services/subscription.
 *
 * GO-LIVE: `npx expo install expo-notifications`, then enable the block below.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // const N = require('expo-notifications');
    // const cur = await N.getPermissionsAsync();
    // if (cur.granted) return true;
    // const req = await N.requestPermissionsAsync();
    // return Boolean(req.granted);
    return false;
  } catch {
    return false;
  }
}
