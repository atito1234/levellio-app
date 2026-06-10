import {
  capsule,
  crc32,
  encodePng,
  hexToRgba,
  Raster,
  shapesToSvg,
  type Shape,
} from '@/tools/icon/render';

const PNG_SIG = '89504e470d0a1a0a';

describe('hexToRgba', () => {
  it('parses #RRGGBB as fully opaque', () => {
    expect(hexToRgba('#6C4CF1')).toEqual([108, 76, 241, 255]);
  });

  it('expands #RGB shorthand', () => {
    expect(hexToRgba('#fff')).toEqual([255, 255, 255, 255]);
  });

  it('reads the alpha channel from #RRGGBBAA', () => {
    expect(hexToRgba('#1B1B2A14')).toEqual([27, 27, 42, 20]);
  });

  it('rejects malformed input', () => {
    expect(() => hexToRgba('#xyz')).toThrow(/Invalid hex/);
    expect(() => hexToRgba('#12345')).toThrow(/Invalid hex/);
  });
});

describe('crc32', () => {
  it('matches the standard CRC-32 check vector', () => {
    // "123456789" → 0xCBF43926 per the canonical CRC-32 test.
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });
});

describe('encodePng', () => {
  it('emits a valid PNG signature and IHDR dimensions', () => {
    const rgba = new Uint8Array(2 * 2 * 4).fill(255);
    const png = encodePng(2, 2, rgba);
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIG);
    expect(png.readUInt32BE(16)).toBe(2); // width
    expect(png.readUInt32BE(20)).toBe(2); // height
    expect(png[25]).toBe(6); // color type RGBA
  });
});

describe('Raster', () => {
  const px = (buf: Uint8Array, w: number, x: number, y: number): number[] => {
    const o = (y * w + x) * 4;
    return [buf[o] ?? 0, buf[o + 1] ?? 0, buf[o + 2] ?? 0, buf[o + 3] ?? 0];
  };

  it('fills an opaque background', () => {
    const r = new Raster(2, 2, 2);
    r.fill('#16C8A8');
    const out = r.downsample();
    expect(px(out, 2, 0, 0)).toEqual([22, 200, 168, 255]);
  });

  it('rasterizes a rect over a transparent canvas with clean coverage', () => {
    const r = new Raster(4, 4, 4);
    r.draw([{ kind: 'rect', x: 0, y: 0, w: 2, h: 4, fill: '#FFB23E' }]);
    const out = r.downsample();
    // Left half is opaque gold, right half remains transparent.
    expect(px(out, 4, 0, 0)).toEqual([255, 178, 62, 255]);
    expect(px(out, 4, 3, 0)[3]).toBe(0);
  });

  it('anti-aliases circle edges (partial coverage on the boundary)', () => {
    const r = new Raster(8, 8, 4);
    r.draw([{ kind: 'circle', cx: 4, cy: 4, rad: 3, fill: '#000000' }]);
    const out = r.downsample();
    const center = px(out, 8, 4, 4)[3];
    const corner = px(out, 8, 0, 0)[3];
    expect(center).toBe(255);
    expect(corner).toBe(0);
  });

  it('produces a PNG of the requested size', () => {
    const r = new Raster(16, 16, 2);
    r.fill('#6C4CF1');
    const png = r.toPng();
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIG);
    expect(png.readUInt32BE(16)).toBe(16);
  });
});

describe('capsule', () => {
  it('expands into a quad plus two round caps', () => {
    const shapes = capsule(0, 0, 10, 0, 4, '#16C8A8');
    expect(shapes).toHaveLength(3);
    expect(shapes[0]?.kind).toBe('polygon');
    expect(shapes[1]?.kind).toBe('circle');
    expect(shapes[2]?.kind).toBe('circle');
  });
});

describe('shapesToSvg', () => {
  const shapes: Shape[] = [
    { kind: 'rect', x: 1, y: 2, w: 3, h: 4, r: 1, fill: '#16C8A8' },
    { kind: 'circle', cx: 5, cy: 5, rad: 2, fill: '#FFB23E' },
    { kind: 'polygon', points: [[0, 0], [1, 0], [1, 1]], fill: '#6C4CF1' },
  ];

  it('serializes shapes with a viewBox and optional background', () => {
    const svg = shapesToSvg(10, 10, shapes, '#6C4CF1');
    expect(svg).toContain('viewBox="0 0 10 10"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<polygon');
    expect(svg).toContain('#FFB23E');
    // Background drawn first as a full-bleed rect.
    expect(svg.indexOf('width="10" height="10" fill="#6C4CF1"')).toBeGreaterThan(-1);
  });

  it('omits the background rect when none is given', () => {
    const svg = shapesToSvg(10, 10, shapes);
    expect(svg).not.toContain('fill="#6C4CF1"/>\n  <rect x');
  });
});
