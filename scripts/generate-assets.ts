/**
 * Generates Levellio's store assets (app icon, adaptive icon, splash, favicon)
 * from the vector mark in `src/tools/icon`. Pure Node — no native tooling.
 *
 *   npm run generate:assets
 *
 * Runs on Node's built-in TypeScript support (Node >= 22), so no extra runtime
 * dependency is required. Outputs PNGs (wired into app.json) plus SVG sources
 * (for designers) into ./assets.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_KINDS, type AssetKind, buildAsset } from '../src/tools/icon/assets.ts';
import { Raster, shapesToSvg } from '../src/tools/icon/render.ts';

// Run via `npm run generate:assets` from the project root.
const outDir = join(process.cwd(), 'assets');

const PNG_NAME: Record<AssetKind, string> = {
  icon: 'icon.png',
  foreground: 'adaptive-icon-foreground.png',
  background: 'adaptive-icon-background.png',
  splash: 'splash.png',
  favicon: 'favicon.png',
};

const SVG_NAME: Record<AssetKind, string> = {
  icon: 'icon.svg',
  foreground: 'adaptive-icon-foreground.svg',
  background: 'adaptive-icon-background.svg',
  splash: 'splash.svg',
  favicon: 'favicon.svg',
};

mkdirSync(outDir, { recursive: true });

for (const kind of ASSET_KINDS) {
  const spec = buildAsset(kind);

  const raster = new Raster(spec.size, spec.size, 4);
  if (spec.background) raster.fill(spec.background);
  raster.draw(spec.shapes);
  const png = raster.toPng();
  writeFileSync(join(outDir, PNG_NAME[kind]), png);

  const svg = shapesToSvg(spec.size, spec.size, spec.shapes, spec.background ?? undefined);
  writeFileSync(join(outDir, SVG_NAME[kind]), svg, 'utf8');

  console.log(`  ${kind.padEnd(11)} → ${PNG_NAME[kind]} (${png.length} B) + ${SVG_NAME[kind]}`);
}

console.log(`\nWrote ${ASSET_KINDS.length} assets to ${outDir}`);
