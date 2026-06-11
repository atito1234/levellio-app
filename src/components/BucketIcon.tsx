import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { getBucketIcon } from '@/data/bucketIcons';

/** Renders a curated bucket icon, filled in `tint`. Decorative by default. */
export function BucketIcon({ iconId, size = 24, tint }: { iconId: string; size?: number; tint: string }) {
  const icon = getBucketIcon(iconId);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {icon.paths.map((d, i) => (
        <Path key={i} d={d} fill={tint} />
      ))}
    </Svg>
  );
}
