import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import { ringColor, type CapacityColorId } from '@/lib/compounding';

const TRACK = '#E8E6E0';

/**
 * A capacity progress ring (0-100). Decorative by default — the surrounding
 * control/label supplies the accessible name. Gold appears only at 100% (via
 * ringColor); partial rings use the capacity's violet/teal hue.
 */
export function CapacityRing({
  level,
  colorId,
  size = 64,
  strokeWidth = 6,
  children,
}: {
  level: number;
  colorId: CapacityColorId;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, level));
  const offset = c * (1 - clamped / 100);
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={cx} cy={cx} r={r} stroke={TRACK} strokeWidth={strokeWidth} fill="none" />
      {clamped > 0 && (
        <G transform={`rotate(-90, ${cx}, ${cx})`}>
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke={ringColor(clamped, colorId)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </G>
      )}
      {children}
    </Svg>
  );
}
