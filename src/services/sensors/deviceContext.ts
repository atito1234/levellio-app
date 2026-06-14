/**
 * Device-context capture for activity sessions (location, speed, …). This is the
 * single seam where richer sensor metrics enter the metadata pipeline.
 *
 * Privacy + honesty: capture is OFF by default and only attempted when the user
 * has opted in (the `enabled` flag mirrors the includeLocation toggle). It is
 * fully guarded — no permission, no fix, or a slow GPS all return null and NEVER
 * block completing an activity (a hard timeout races the request).
 */
import * as Location from 'expo-location';
import type { LocationSample } from '@/lib/metadata';

const LOCATION_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Attempt to capture the current location/speed. Returns null unless location
 * capture is enabled, permitted, and obtained within the timeout. Safe to await
 * unconditionally — it never throws.
 */
export async function captureLocationSafely(enabled: boolean): Promise<LocationSample | null> {
  if (!enabled) return null;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_TIMEOUT_MS,
    );
    if (!pos) return null;

    const { latitude, longitude, accuracy, speed } = pos.coords;
    return {
      lat: latitude,
      lng: longitude,
      ...(typeof accuracy === 'number' ? { accuracy } : {}),
      // speed is metres/second; null/negative when the device can't report it.
      ...(typeof speed === 'number' && speed >= 0 ? { speed } : {}),
    };
  } catch {
    return null;
  }
}
