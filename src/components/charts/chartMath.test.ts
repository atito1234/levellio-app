import {
  axisTicks,
  intensityLevel,
  linePoints,
  niceMax,
  polygonPath,
  radarAxisEnds,
  radarPoints,
  radialPositions,
  scaleY,
  spokeAngle,
} from './chartMath';

describe('niceMax', () => {
  it('rounds up to 1/2/5 × 10ⁿ', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(0.4)).toBe(0.5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(48)).toBe(50);
    expect(niceMax(100)).toBe(100);
  });
});

describe('axisTicks', () => {
  it('produces evenly spaced ticks 0..niceMax', () => {
    expect(axisTicks(80, 4)).toEqual([0, 25, 50, 75, 100]);
  });
});

describe('scaleY', () => {
  it('puts 0 at the bottom and max at the top, clamping out-of-range', () => {
    expect(scaleY(0, 100, 200)).toBe(200);
    expect(scaleY(100, 100, 200)).toBe(0);
    expect(scaleY(50, 100, 200)).toBe(100);
    expect(scaleY(150, 100, 200)).toBe(0); // clamped
  });
});

describe('linePoints', () => {
  it('spreads points across the width and scales y', () => {
    expect(linePoints([0, 100], 100, 100, 100)).toBe('0.00,100.00 100.00,0.00');
  });
  it('centres a single point', () => {
    expect(linePoints([50], 100, 100, 100)).toBe('50.00,50.00');
  });
  it('returns empty for no values', () => {
    expect(linePoints([], 100, 100)).toBe('');
  });
});

describe('spokeAngle', () => {
  it('starts at the top (−90°)', () => {
    expect(spokeAngle(0, 4)).toBeCloseTo(-Math.PI / 2);
    expect(spokeAngle(1, 4)).toBeCloseTo(0); // quarter turn → 3 o'clock
  });
});

describe('radarPoints / radarAxisEnds', () => {
  const center = { x: 100, y: 100 };
  it('places a full-value vertex on the rim at the top', () => {
    const pts = radarPoints([100, 0, 0, 0], 100, center, 50);
    expect(pts[0]!.x).toBeCloseTo(100);
    expect(pts[0]!.y).toBeCloseTo(50); // straight up
  });
  it('scales radius by value/max', () => {
    const pts = radarPoints([50], 100, center, 50);
    expect(pts[0]!.y).toBeCloseTo(75); // halfway up
  });
  it('axis ends sit on the rim', () => {
    const ends = radarAxisEnds(4, center, 50);
    expect(ends[0]!.y).toBeCloseTo(50);
    expect(ends[2]!.y).toBeCloseTo(150); // bottom
  });
});

describe('radialPositions', () => {
  it('places n nodes on a circle starting at the top', () => {
    const pts = radialPositions(4, { x: 0, y: 0 }, 10);
    expect(pts).toHaveLength(4);
    expect(pts[0]!.x).toBeCloseTo(0);
    expect(pts[0]!.y).toBeCloseTo(-10);
  });
  it('returns [] for non-positive counts', () => {
    expect(radialPositions(0, { x: 0, y: 0 }, 10)).toEqual([]);
  });
});

describe('intensityLevel', () => {
  it('buckets a value into 0..levels (0 stays empty)', () => {
    expect(intensityLevel(0, 10)).toBe(0);
    expect(intensityLevel(1, 10, 4)).toBe(1);
    expect(intensityLevel(10, 10, 4)).toBe(4);
    expect(intensityLevel(5, 10, 4)).toBe(2);
  });
  it('guards against a zero max', () => {
    expect(intensityLevel(5, 0)).toBe(0);
  });
});

describe('polygonPath', () => {
  it('joins points into an svg list', () => {
    expect(polygonPath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('1.00,2.00 3.00,4.00');
  });
});
