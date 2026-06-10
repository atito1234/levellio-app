/**
 * Dependency-free vector → raster/SVG renderer for Levellio store assets.
 *
 * The whole pipeline uses only Node built-ins (`node:zlib`) so app icons,
 * adaptive icons and the splash mark can be regenerated in CI with no native
 * tooling (no sharp / librsvg / headless browser). Shapes are declared once and
 * emitted to BOTH a PNG (via a tiny from-scratch encoder) and an SVG source, so
 * the two never drift.
 *
 * Style matches our HeroAvatar/Wisp components: flat, geometric, soft rounded
 * forms (capsules), same-hue depth shading, soft drop shadow — locked palette.
 */
import zlib from 'node:zlib';

export type Rgba = readonly [number, number, number, number];

/** Parse `#RGB`, `#RRGGBB` or `#RRGGBBAA` into an [r,g,b,a] tuple (0-255). */
export function hexToRgba(hex: string): Rgba {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length === 6) h += 'ff';
  if (h.length !== 8 || /[^0-9a-fA-F]/.test(h)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const n = (i: number): number => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), n(6)];
}

// ---------------------------------------------------------------------------
// Shapes — the single source of truth shared by the rasterizer and SVG writer.
// ---------------------------------------------------------------------------

export type Point = readonly [number, number];

export type Shape =
  | { readonly kind: 'rect'; x: number; y: number; w: number; h: number; r?: number; fill: string }
  | { readonly kind: 'circle'; cx: number; cy: number; rad: number; fill: string }
  | { readonly kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string }
  | { readonly kind: 'polygon'; points: readonly Point[]; fill: string };

/** A soft rounded "capsule" (limb/chevron-arm) as composite primitives. */
export function capsule(x1: number, y1: number, x2: number, y2: number, thick: number, fill: string): Shape[] {
  const r = thick / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Unit normal to the segment, scaled to the capsule half-width.
  const nx = (-dy / len) * r;
  const ny = (dx / len) * r;
  const quad: Point[] = [
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
  ];
  return [
    { kind: 'polygon', points: quad, fill },
    { kind: 'circle', cx: x1, cy: y1, rad: r, fill },
    { kind: 'circle', cx: x2, cy: y2, rad: r, fill },
  ];
}

// ---------------------------------------------------------------------------
// Rasterizer — supersampled hard-edge draw + premultiplied box downsample (AA).
// ---------------------------------------------------------------------------

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly ss: number;
  readonly bw: number;
  readonly bh: number;
  readonly data: Uint8Array; // RGBA at supersampled resolution

  constructor(w: number, h: number, ss = 4) {
    this.w = w;
    this.h = h;
    this.ss = ss;
    this.bw = w * ss;
    this.bh = h * ss;
    this.data = new Uint8Array(this.bw * this.bh * 4);
  }

  /** Fill the whole canvas with an opaque background color. */
  fill(fill: string): void {
    const [r, g, b, a] = hexToRgba(fill);
    const d = this.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }

  /** Source-over alpha blend of one supersampled pixel. */
  private blend(bx: number, by: number, sr: number, sg: number, sb: number, sa: number): void {
    if (bx < 0 || by < 0 || bx >= this.bw || by >= this.bh || sa <= 0) return;
    const i = (by * this.bw + bx) * 4;
    const d = this.data;
    const sA = sa / 255;
    const dA = (d[i + 3] ?? 0) / 255;
    const outA = sA + dA * (1 - sA);
    if (outA <= 0) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      return;
    }
    const mix = (s: number, dv: number): number => Math.round((s * sA + dv * dA * (1 - sA)) / outA);
    d[i] = mix(sr, d[i] ?? 0);
    d[i + 1] = mix(sg, d[i + 1] ?? 0);
    d[i + 2] = mix(sb, d[i + 2] ?? 0);
    d[i + 3] = Math.round(outA * 255);
  }

  private drawShape(s: Shape): void {
    const ss = this.ss;
    const [r, g, b, a] = hexToRgba(s.fill);
    // Per-shape inside test in target coordinates; iterate the supersampled
    // bounding box only.
    let minX: number, minY: number, maxX: number, maxY: number;
    let inside: (px: number, py: number) => boolean;

    if (s.kind === 'rect') {
      minX = s.x;
      minY = s.y;
      maxX = s.x + s.w;
      maxY = s.y + s.h;
      const rad = Math.min(s.r ?? 0, s.w / 2, s.h / 2);
      inside = (px, py) => {
        if (px < s.x || py < s.y || px > s.x + s.w || py > s.y + s.h) return false;
        if (rad <= 0) return true;
        const cx = Math.min(Math.max(px, s.x + rad), s.x + s.w - rad);
        const cy = Math.min(Math.max(py, s.y + rad), s.y + s.h - rad);
        return (px - cx) ** 2 + (py - cy) ** 2 <= rad * rad;
      };
    } else if (s.kind === 'circle') {
      minX = s.cx - s.rad;
      minY = s.cy - s.rad;
      maxX = s.cx + s.rad;
      maxY = s.cy + s.rad;
      inside = (px, py) => (px - s.cx) ** 2 + (py - s.cy) ** 2 <= s.rad * s.rad;
    } else if (s.kind === 'ellipse') {
      minX = s.cx - s.rx;
      minY = s.cy - s.ry;
      maxX = s.cx + s.rx;
      maxY = s.cy + s.ry;
      inside = (px, py) => ((px - s.cx) / s.rx) ** 2 + ((py - s.cy) / s.ry) ** 2 <= 1;
    } else {
      const xs = s.points.map((p) => p[0]);
      const ys = s.points.map((p) => p[1]);
      minX = Math.min(...xs);
      minY = Math.min(...ys);
      maxX = Math.max(...xs);
      maxY = Math.max(...ys);
      inside = (px, py) => pointInPolygon(px, py, s.points);
    }

    const bx0 = Math.max(0, Math.floor(minX * ss));
    const by0 = Math.max(0, Math.floor(minY * ss));
    const bx1 = Math.min(this.bw - 1, Math.ceil(maxX * ss));
    const by1 = Math.min(this.bh - 1, Math.ceil(maxY * ss));
    for (let by = by0; by <= by1; by++) {
      const py = (by + 0.5) / ss;
      for (let bx = bx0; bx <= bx1; bx++) {
        const px = (bx + 0.5) / ss;
        if (inside(px, py)) this.blend(bx, by, r, g, b, a);
      }
    }
  }

  draw(shapes: readonly Shape[]): void {
    for (const s of shapes) this.drawShape(s);
  }

  /** Premultiplied box-filter downsample → final RGBA at target resolution. */
  downsample(): Uint8Array {
    const out = new Uint8Array(this.w * this.h * 4);
    const ss = this.ss;
    const n = ss * ss;
    const d = this.data;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        for (let sy = 0; sy < ss; sy++) {
          for (let sx = 0; sx < ss; sx++) {
            const i = ((y * ss + sy) * this.bw + (x * ss + sx)) * 4;
            const a = d[i + 3] ?? 0;
            sumA += a;
            sumR += (d[i] ?? 0) * a;
            sumG += (d[i + 1] ?? 0) * a;
            sumB += (d[i + 2] ?? 0) * a;
          }
        }
        const o = (y * this.w + x) * 4;
        if (sumA > 0) {
          out[o] = Math.round(sumR / sumA);
          out[o + 1] = Math.round(sumG / sumA);
          out[o + 2] = Math.round(sumB / sumA);
        }
        out[o + 3] = Math.round(sumA / n);
      }
    }
    return out;
  }

  toPng(): Buffer {
    return encodePng(this.w, this.h, this.downsample());
  }
}

function pointInPolygon(px: number, py: number, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (!pi || !pj) continue;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// PNG encoder (8-bit RGBA, no filtering) — Node zlib + from-scratch chunks.
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ (buf[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Each scanline is prefixed with filter byte 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// SVG writer — same shapes, scalable source for designers.
// ---------------------------------------------------------------------------

const f = (n: number): string => Number(n.toFixed(2)).toString();

function shapeToSvg(s: Shape): string {
  switch (s.kind) {
    case 'rect':
      return `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}"${
        s.r ? ` rx="${f(s.r)}" ry="${f(s.r)}"` : ''
      } fill="${s.fill}"/>`;
    case 'circle':
      return `<circle cx="${f(s.cx)}" cy="${f(s.cy)}" r="${f(s.rad)}" fill="${s.fill}"/>`;
    case 'ellipse':
      return `<ellipse cx="${f(s.cx)}" cy="${f(s.cy)}" rx="${f(s.rx)}" ry="${f(s.ry)}" fill="${s.fill}"/>`;
    case 'polygon':
      return `<polygon points="${s.points.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="${s.fill}"/>`;
  }
}

export function shapesToSvg(
  width: number,
  height: number,
  shapes: readonly Shape[],
  background?: string,
): string {
  const bg = background ? `<rect width="${f(width)}" height="${f(height)}" fill="${background}"/>` : '';
  const body = shapes.map(shapeToSvg).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width)}" height="${f(height)}" viewBox="0 0 ${f(
    width,
  )} ${f(height)}">\n  ${bg}${bg ? '\n  ' : ''}${body}\n</svg>\n`;
}
