/**
 * Geo helpers — pure, no I/O. Used to tell whether a completion happened "on the
 * ground" at a project's location (within its radius) vs. anywhere else.
 */

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in kilometres (haversine). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True when (lat,lng) is within `radiusKm` of the centre. */
export function isWithinRadius(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): boolean {
  if (!(radiusKm > 0)) return false;
  return distanceKm(lat, lng, centerLat, centerLng) <= radiusKm;
}
