/**
 * Pure geometry/scale helpers for the SVG charts — kept out of the components so
 * the fiddly math (axis ticks, radar polygons, radial node layout, heatmap
 * intensity) is unit-tested. No React, no I/O.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Round a value up to a "nice" axis maximum (1/2/5 × 10ⁿ). Always ≥ 1. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const frac = value / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * base;
}

/** Evenly-spaced tick values from 0..max (inclusive), `count` intervals. */
export function axisTicks(max: number, count = 4): number[] {
  const m = niceMax(max);
  const ticks: number[] = [];
  for (let i = 0; i <= count; i += 1) ticks.push(Math.round((m / count) * i * 100) / 100);
  return ticks;
}

/** Map a value to a y pixel (0 at bottom) within `height`, given the axis max. */
export function scaleY(value: number, max: number, height: number): number {
  const m = max <= 0 ? 1 : max;
  const clamped = Math.max(0, Math.min(value, m));
  return height - (clamped / m) * height;
}

/** Polyline "x,y x,y …" for a series across `width`, scaled to `max` over `height`. */
export function linePoints(values: readonly number[], width: number, height: number, max?: number): string {
  const n = values.length;
  if (n === 0) return '';
  const m = max ?? niceMax(Math.max(...values));
  return values
    .map((v, i) => {
      const x = n <= 1 ? width / 2 : (i / (n - 1)) * width;
      return `${x.toFixed(2)},${scaleY(v, m, height).toFixed(2)}`;
    })
    .join(' ');
}

/** Angle (radians) for spoke `i` of `n`, starting at the top (12 o'clock). */
export function spokeAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i / n) * Math.PI * 2;
}

/** Vertices of a radar polygon for `values` (each 0..max) over `n` axes. */
export function radarPoints(values: readonly number[], max: number, center: Pt, radius: number): Pt[] {
  const n = values.length;
  const m = max <= 0 ? 1 : max;
  return values.map((v, i) => {
    const r = (Math.max(0, Math.min(v, m)) / m) * radius;
    const a = spokeAngle(i, n);
    return { x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) };
  });
}

/** Outer endpoints of the radar axes (for drawing spokes + the outline ring). */
export function radarAxisEnds(n: number, center: Pt, radius: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = spokeAngle(i, n);
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) };
  });
}

/** `n` node positions evenly placed on a circle (for the mind-map ring). */
export function radialPositions(n: number, center: Pt, radius: number, startAngle = -Math.PI / 2): Pt[] {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (i / n) * Math.PI * 2;
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) };
  });
}

/** Heatmap intensity bucket 0..levels for a value against a max (0 → empty). */
export function intensityLevel(value: number, max: number, levels = 4): number {
  if (value <= 0 || max <= 0) return 0;
  const t = Math.min(1, value / max);
  return Math.max(1, Math.ceil(t * levels));
}

/** Format an svg points list from Pt[]. */
export function polygonPath(points: readonly Pt[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
