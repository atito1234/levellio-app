import { ASSET_KINDS, buildAsset, ICON_PALETTE } from '@/tools/icon/assets';
import type { Shape } from '@/tools/icon/render';

const fills = (shapes: Shape[]): string[] => shapes.map((s) => s.fill);

describe('buildAsset', () => {
  it('defines all five store assets', () => {
    expect(ASSET_KINDS).toEqual(['icon', 'foreground', 'background', 'splash', 'favicon']);
  });

  it('renders the app icon on the violet ground using all three brand hues', () => {
    const icon = buildAsset('icon');
    expect(icon.size).toBe(1024);
    expect(icon.background).toBe(ICON_PALETTE.violet);
    const used = fills(icon.shapes);
    expect(used).toContain(ICON_PALETTE.teal);
    expect(used).toContain(ICON_PALETTE.gold);
  });

  it('keeps the adaptive foreground transparent and within a safe central zone', () => {
    const fg = buildAsset('foreground');
    expect(fg.background).toBeNull();
    // Every drawn coordinate stays inside the central ~80% of the 1024 canvas.
    for (const s of fg.shapes) {
      if (s.kind === 'circle') {
        expect(s.cx - s.rad).toBeGreaterThan(80);
        expect(s.cx + s.rad).toBeLessThan(1024 - 80);
      }
    }
  });

  it('renders the adaptive background as a solid violet with depth only', () => {
    const bg = buildAsset('background');
    expect(bg.background).toBe(ICON_PALETTE.violet);
    // No teal/gold mark on the background layer.
    expect(fills(bg.shapes)).not.toContain(ICON_PALETTE.teal);
    expect(fills(bg.shapes)).not.toContain(ICON_PALETTE.gold);
  });

  it('renders the splash mark on a transparent canvas', () => {
    const splash = buildAsset('splash');
    expect(splash.background).toBeNull();
    expect(splash.shapes.length).toBeGreaterThan(0);
  });

  it('renders a small opaque favicon', () => {
    const fav = buildAsset('favicon');
    expect(fav.size).toBe(64);
    expect(fav.background).toBe(ICON_PALETTE.violet);
  });
});
