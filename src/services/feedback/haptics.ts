/**
 * Tactile feedback wrapper over `expo-haptics`. The dopamine "buzz" that lands a
 * completion and, more strongly, a community contribution and a team win.
 *
 * The module is loaded with a guarded require so the app (and the test runner)
 * never crash if the native module isn't present — haptics simply no-op. Every
 * call is gated by the user's `hapticsEnabled` setting and fails silently.
 */

type HapticsModule = {
  notificationAsync: (type: unknown) => Promise<void>;
  impactAsync: (style: unknown) => Promise<void>;
  NotificationFeedbackType: { Success: unknown; Warning: unknown; Error: unknown };
  ImpactFeedbackStyle: { Light: unknown; Medium: unknown; Heavy: unknown };
};

let Haptics: HapticsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require('expo-haptics') as HapticsModule;
} catch {
  Haptics = null;
}

const safe = (run: () => Promise<void>) => {
  try {
    void run().catch(() => undefined);
  } catch {
    /* no-op */
  }
};

export const haptics = {
  /** A gentle success tap — every habit completion. */
  success(enabled: boolean) {
    if (!enabled || !Haptics) return;
    safe(() => Haptics!.notificationAsync(Haptics!.NotificationFeedbackType.Success));
  },
  /** A firmer nudge when a completion powers a community project. */
  contribute(enabled: boolean) {
    if (!enabled || !Haptics) return;
    safe(() => Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Medium));
  },
  /** The big celebratory pulse when the team crosses the weekly goal. */
  teamGoal(enabled: boolean) {
    if (!enabled || !Haptics) return;
    safe(() => Haptics!.impactAsync(Haptics!.ImpactFeedbackStyle.Heavy));
    setTimeout(() => safe(() => Haptics!.notificationAsync(Haptics!.NotificationFeedbackType.Success)), 140);
  },
};
