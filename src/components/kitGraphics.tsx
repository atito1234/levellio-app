import React from 'react';
import Svg, { ClipPath, Defs, G, Path, Polygon, Rect } from 'react-native-svg';
import type { KitPattern, WorldCupKit } from '@/data/worldCupKits';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Geometric color-block overlay for a kit pattern, in `color`, covering `region`.
 * Shapes may overflow the region; callers clip them to the garment silhouette.
 * Shared by the hero avatar's torso and the kit-picker jersey icon so a kit
 * looks identical wherever it appears.
 */
export function kitOverlay(pattern: KitPattern, color: string, region: Region, keyPrefix = 'k'): React.ReactElement[] {
  const { x, y, w, h } = region;
  switch (pattern) {
    case 'solid':
      return [];
    case 'stripes': {
      const bw = w * 0.1;
      return [0.12, 0.37, 0.62, 0.87].map((f, i) => (
        <Rect key={`${keyPrefix}-s${i}`} x={x + w * f - bw / 2} y={y - h} width={bw} height={h * 3} fill={color} />
      ));
    }
    case 'halves':
      return [<Rect key={`${keyPrefix}-h`} x={x + w / 2} y={y - h} width={w} height={h * 3} fill={color} />];
    case 'sash':
      return [
        <Polygon
          key={`${keyPrefix}-sash`}
          points={`${x + w * 0.62},${y - h} ${x + w + w},${y - h} ${x + w * 0.38},${y + h * 2} ${x - w},${y + h * 2}`}
          fill={color}
        />,
      ];
    case 'hoops': {
      const bh = h * 0.12;
      return [0.2, 0.5, 0.8].map((f, i) => (
        <Rect key={`${keyPrefix}-o${i}`} x={x - w} y={y + h * f - bh / 2} width={w * 3} height={bh} fill={color} />
      ));
    }
  }
}

// Simple T-shirt silhouette (with short sleeves) for the picker swatch.
const SHIRT_PATH =
  'M30 30 L42 23 Q50 28 58 23 L70 30 L79 42 L69 49 L67 80 Q50 85 33 80 L31 49 L21 42 Z';
const SHIRT_REGION: Region = { x: 21, y: 23, w: 58, h: 62 };
const SHIRT_COLLAR = 'M42 23 Q50 30 58 23 L54 21 Q50 24 46 21 Z';

/**
 * Standalone jersey icon rendering a kit's colorway + pattern. Decorative —
 * the surrounding control supplies the accessible name.
 */
export function KitJersey({ kit, size = 56 }: { kit: WorldCupKit; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id="shirtClip">
          <Path d={SHIRT_PATH} />
        </ClipPath>
      </Defs>
      <Path d={SHIRT_PATH} fill={kit.primaryColor} />
      <G clipPath="url(#shirtClip)">{kitOverlay(kit.pattern, kit.secondaryColor, SHIRT_REGION, 'sw')}</G>
      <Path d={SHIRT_COLLAR} fill={kit.accentColor} />
    </Svg>
  );
}
