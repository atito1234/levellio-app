/**
 * Steps / pedometer service seam (B2a — scaffold).
 *
 * The real pedometer needs native motion APIs (expo-sensors `Pedometer` or
 * HealthKit / Health Connect) that are NOT available in Expo Go — they require a
 * custom EAS dev build. To keep the app runnable in Expo Go today, this ships an
 * inert default implementation; the device-backed one is wired up once we move to
 * a dev build (see TODO below). Everything is gated by `HEALTH_STEPS_ENABLED`.
 */

export interface StepsService {
  /** Whether a real device step source is available on this build/platform. */
  isAvailable(): Promise<boolean>;
  /** Steps recorded so far today (local day). 0 when unavailable. */
  getTodaySteps(): Promise<number>;
  /**
   * Subscribe to live step updates for today. Returns an unsubscribe function.
   * The inert default never emits.
   */
  subscribeToday(onChange: (steps: number) => void): () => void;
}

/** Inert default — safe in Expo Go: reports unavailable, never emits. */
const inertStepsService: StepsService = {
  async isAvailable() {
    return false;
  },
  async getTodaySteps() {
    return 0;
  },
  subscribeToday() {
    return () => {};
  },
};

/**
 * The active service. Today it's inert. When we cut a custom dev build, replace
 * this with a device-backed implementation, e.g.:
 *
 *   // import { Pedometer } from 'expo-sensors';
 *   // isAvailable: () => Pedometer.isAvailableAsync()
 *   // getTodaySteps: () => Pedometer.getStepCountAsync(startOfLocalDay, now)
 *   // subscribeToday: (cb) => Pedometer.watchStepCount(r => cb(r.steps)).remove
 *
 * Loaded lazily so no native module is imported in Expo Go.
 */
export const stepsService: StepsService = inertStepsService;
