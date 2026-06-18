import { distanceKm, isWithinRadius } from './geo';

describe('geo', () => {
  // Fort-Liberté, Haiti (approx) and a point ~2km away.
  const FL = { lat: 19.6656, lng: -71.8448 };

  it('distance is ~0 for the same point', () => {
    expect(distanceKm(FL.lat, FL.lng, FL.lat, FL.lng)).toBeCloseTo(0, 5);
  });

  it('computes a known distance (Paris ↔ London ≈ 343km)', () => {
    const d = distanceKm(48.8566, 2.3522, 51.5074, -0.1278);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(355);
  });

  it('isWithinRadius: true when close, false when far', () => {
    // ~0.5km north
    const near = { lat: FL.lat + 0.0045, lng: FL.lng };
    expect(isWithinRadius(near.lat, near.lng, FL.lat, FL.lng, 1)).toBe(true);
    // ~5km north
    const far = { lat: FL.lat + 0.045, lng: FL.lng };
    expect(isWithinRadius(far.lat, far.lng, FL.lat, FL.lng, 1)).toBe(false);
  });

  it('isWithinRadius: false for a non-positive radius', () => {
    expect(isWithinRadius(FL.lat, FL.lng, FL.lat, FL.lng, 0)).toBe(false);
  });
});
