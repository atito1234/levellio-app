import { sceneForCategory, trailPointAt } from './journeyScene';

describe('sceneForCategory', () => {
  it('maps achievement areas to mountain, reflective areas to forest', () => {
    expect(sceneForCategory('fitness')).toBe('mountain');
    expect(sceneForCategory('finance')).toBe('mountain');
    expect(sceneForCategory('mind')).toBe('forest');
    expect(sceneForCategory('relationships')).toBe('forest');
  });
  it('defaults to mountain when unknown', () => {
    expect(sceneForCategory(undefined)).toBe('mountain');
  });
});

describe('trailPointAt', () => {
  it('clamps to the trail ends', () => {
    expect(trailPointAt(0)).toEqual({ x: 10, y: 88 });
    expect(trailPointAt(1)).toEqual({ x: 80, y: 14 });
    expect(trailPointAt(-5)).toEqual({ x: 10, y: 88 });
    expect(trailPointAt(9)).toEqual({ x: 80, y: 14 });
  });
  it('climbs (y decreases) and moves right as progress grows', () => {
    const lo = trailPointAt(0.25);
    const hi = trailPointAt(0.75);
    expect(hi.y).toBeLessThan(lo.y);
    expect(hi.x).toBeGreaterThan(lo.x);
  });
});
