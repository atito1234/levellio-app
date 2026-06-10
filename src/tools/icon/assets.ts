/**
 * Levellio brand mark + store-asset definitions.
 *
 * The mark is a stacked double chevron ("level up"): a teal action chevron with
 * a gold reward chevron rising above it, on the violet identity ground. Built
 * from soft rounded capsules to match the HeroAvatar/Wisp aesthetic. Geometry is
 * authored in a 1000×1000 design box and scaled/centered onto each target.
 */
import { capsule, type Point, type Shape } from './render.ts';

export const ICON_PALETTE = {
  violet: '#6C4CF1',
  violetGlow: '#8A6CF7',
  teal: '#16C8A8',
  gold: '#FFB23E',
  shadow: '#1B1B2A',
} as const;

const DESIGN = 1000;

interface ChevronSpec {
  apexY: number;
  halfW: number;
  drop: number;
  thick: number;
  fill: string;
}

/** Lower (teal) + upper (gold) chevrons, centered in the design box. */
const CHEVRONS: readonly ChevronSpec[] = [
  { apexY: 510, halfW: 235, drop: 205, thick: 150, fill: ICON_PALETTE.teal },
  { apexY: 290, halfW: 235, drop: 205, thick: 150, fill: ICON_PALETTE.gold },
];

function chevronShapes(spec: ChevronSpec, fill: string, dy = 0): Shape[] {
  const apex: Point = [DESIGN / 2, spec.apexY + dy];
  const left: Point = [DESIGN / 2 - spec.halfW, spec.apexY + spec.drop + dy];
  const right: Point = [DESIGN / 2 + spec.halfW, spec.apexY + spec.drop + dy];
  return [
    ...capsule(apex[0], apex[1], left[0], left[1], spec.thick, fill),
    ...capsule(apex[0], apex[1], right[0], right[1], spec.thick, fill),
  ];
}

function mapShape(s: Shape, factor: number, offset: number): Shape {
  const mx = (v: number): number => v * factor + offset;
  const sc = (v: number): number => v * factor;
  switch (s.kind) {
    case 'rect':
      return { ...s, x: mx(s.x), y: mx(s.y), w: sc(s.w), h: sc(s.h), r: s.r ? sc(s.r) : undefined };
    case 'circle':
      return { ...s, cx: mx(s.cx), cy: mx(s.cy), rad: sc(s.rad) };
    case 'ellipse':
      return { ...s, cx: mx(s.cx), cy: mx(s.cy), rx: sc(s.rx), ry: sc(s.ry) };
    case 'polygon':
      return { ...s, points: s.points.map((p): Point => [mx(p[0]), mx(p[1])]) };
  }
}

/** The mark mapped onto a `size`×`size` canvas, occupying `scale` of it. */
function mark(size: number, scale: number, withShadow: boolean): Shape[] {
  const factor = (size * scale) / DESIGN;
  const offset = (size - size * scale) / 2;
  const out: Shape[] = [];
  if (withShadow) {
    // Faked soft drop shadow: two faint, offset dark copies behind the mark.
    for (const spec of CHEVRONS) {
      out.push(...chevronShapes(spec, `${ICON_PALETTE.shadow}14`, 26));
      out.push(...chevronShapes(spec, `${ICON_PALETTE.shadow}10`, 14));
    }
  }
  for (const spec of CHEVRONS) out.push(...chevronShapes(spec, spec.fill));
  return out.map((s) => mapShape(s, factor, offset));
}

/** A soft same-hue glow disc for violet grounds (adds depth without a gradient). */
function glow(size: number): Shape {
  return { kind: 'circle', cx: size / 2, cy: size * 0.4, rad: size * 0.56, fill: `${ICON_PALETTE.violetGlow}3D` };
}

export type AssetKind = 'icon' | 'foreground' | 'background' | 'splash' | 'favicon';

export interface AssetSpec {
  size: number;
  /** Opaque background fill, or null for a transparent canvas. */
  background: string | null;
  shapes: Shape[];
}

export function buildAsset(kind: AssetKind): AssetSpec {
  switch (kind) {
    case 'icon':
      return { size: 1024, background: ICON_PALETTE.violet, shapes: [glow(1024), ...mark(1024, 0.66, true)] };
    case 'foreground':
      // Android safe zone: keep the mark within the central ~58% of the canvas.
      return { size: 1024, background: null, shapes: mark(1024, 0.56, true) };
    case 'background':
      return { size: 1024, background: ICON_PALETTE.violet, shapes: [glow(1024)] };
    case 'splash':
      return { size: 1024, background: null, shapes: mark(1024, 0.42, false) };
    case 'favicon':
      return { size: 64, background: ICON_PALETTE.violet, shapes: mark(64, 0.7, false) };
  }
}

export const ASSET_KINDS: readonly AssetKind[] = ['icon', 'foreground', 'background', 'splash', 'favicon'];
