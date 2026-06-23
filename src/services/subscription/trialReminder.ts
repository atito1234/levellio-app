/**
 * Schedules a local "your free trial ends in 2 days" reminder so a Plus trial
 * never converts as a surprise charge — the biggest trust complaint about
 * subscription apps. The scheduling logic is complete; the one `expo-notifications`
 * call is gated behind a go-live switch so Metro doesn't resolve the native module
 * before it's installed. No-ops safely until then (store cancellation still works).
 *
 * GO-LIVE: `npx expo install expo-notifications`, then enable the block below.
 */
import type { SubscriptionState } from './SubscriptionService';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Remembered target so we don't reschedule the same reminder repeatedly. */
let scheduledFor: number | null = null;

export async function syncTrialReminder(state: SubscriptionState): Promise<void> {
  // Only relevant during an active trial with a known end date.
  if (state.status !== 'trialing' || !state.trialEndsAt) {
    scheduledFor = null;
    return;
  }
  if (scheduledFor === state.trialEndsAt) return;

  const remindAt = state.trialEndsAt - TWO_DAYS_MS;
  if (remindAt <= Date.now()) return; // too late to be useful

  // GO-LIVE: enable once expo-notifications is installed.
  // const Notifications = require('expo-notifications');
  // const i18n = require('@/i18n').default;
  // const perm = await Notifications.getPermissionsAsync();
  // if (!perm.granted) {
  //   const req = await Notifications.requestPermissionsAsync();
  //   if (!req.granted) return;
  // }
  // await Notifications.scheduleNotificationAsync({
  //   content: {
  //     title: i18n.t('paywall:trialReminderTitle'),
  //     body: i18n.t('paywall:trialReminderBody'),
  //   },
  //   trigger: { date: new Date(remindAt) },
  // });

  scheduledFor = state.trialEndsAt;
}
