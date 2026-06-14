/**
 * Device-context capture for activity sessions (location, speed, …). This is the
 * single seam where richer sensor metrics enter the metadata pipeline.
 *
 * IMPORTANT (privacy + honesty): capture is OFF by default and only attempted
 * when the user has opted in. It is fully guarded — any failure (no permission,
 * no provider, timeout) returns null and NEVER blocks completing an activity.
 *
 * Location/speed require the `expo-location` module + a runtime permission. That
 * native module is not wired yet, so this returns null today (we never claim to
 * have captured a location we didn't). Wiring it later only changes this file —
 * the event shape, privacy toggle, and analytics pipeline are already in place.
 */
import type { LocationSample } from '@/lib/metadata';

/**
 * Attempt to capture the current location/speed. Returns null unless location
 * capture is enabled, permitted, and available. Safe to await unconditionally.
 */
export async function captureLocationSafely(enabled: boolean): Promise<LocationSample | null> {
  if (!enabled) return null;
  try {
    // TODO(location): wire expo-location here, e.g.
    //   const Location = await import('expo-location');
    //   const { status } = await Location.requestForegroundPermissionsAsync();
    //   if (status !== 'granted') return null;
    //   const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    //   return { lat: p.coords.latitude, lng: p.coords.longitude,
    //            accuracy: p.coords.accuracy ?? undefined, speed: p.coords.speed ?? undefined };
    return null;
  } catch {
    return null;
  }
}
