import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { radarAxisEnds, radarPoints, polygonPath, type Pt } from './chartMath';

const VIOLET = '#6C4CF1';
const TRACK = '#E3E3EC';
const MUTED = '#5A5A72';

export interface RadarAxis {
  label: string;
  /** 0..max. */
  value: number;
  /** Optional tap target id (e.g. a capacity id) for the CTA. */
  id?: string;
}

/**
 * A radar/spider chart showing balance across several axes (e.g. the six
 * capacities). Imbalance is visible at a glance — short spokes are the areas of
 * opportunity. Axis labels are tappable to drill into that axis.
 */
export function RadarChart({
  axes,
  max = 100,
  size = 220,
  color = VIOLET,
  onPressAxis,
}: {
  axes: readonly RadarAxis[];
  max?: number;
  size?: number;
  color?: string;
  onPressAxis?: (axis: RadarAxis, index: number) => void;
}) {
  const { t } = useTranslation('charts');
  const [w, setW] = useState(size);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.min(size, e.nativeEvent.layout.width));
  const dim = Math.max(120, w);
  const center: Pt = { x: dim / 2, y: dim / 2 };
  const radius = dim / 2 - 28; // room for labels

  const values = axes.map((a) => a.value);
  const verts = radarPoints(values, max, center, radius);
  const ends = radarAxisEnds(axes.length, center, radius);
  const rings = [0.25, 0.5, 0.75, 1];
  const a11y = axes.map((a) => `${a.label} ${Math.round((a.value / max) * 100)}%`).join(', ');

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={t('radarChart.summary', { a11y })}>
      <Svg width={dim} height={dim}>
        {rings.map((r) => (
          <Polygon
            key={r}
            points={polygonPath(radarPoints(axes.map(() => max * r), max, center, radius))}
            fill="none"
            stroke={TRACK}
            strokeWidth={1}
          />
        ))}
        {ends.map((e, i) => (
          <Line key={i} x1={center.x} y1={center.y} x2={e.x} y2={e.y} stroke={TRACK} strokeWidth={1} />
        ))}
        <Polygon points={polygonPath(verts)} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} />
        {verts.map((v, i) => (
          <Circle key={i} cx={v.x} cy={v.y} r={3} fill={color} />
        ))}
        {ends.map((e, i) => {
          const label = axes[i]?.label ?? '';
          const anchor = e.x < center.x - 4 ? 'end' : e.x > center.x + 4 ? 'start' : 'middle';
          const lx = e.x + (e.x < center.x ? -4 : e.x > center.x ? 4 : 0);
          const ly = e.y + (e.y < center.y ? -6 : 12);
          return (
            <SvgText
              key={`l-${i}`}
              x={lx}
              y={ly}
              fontSize={11}
              fill={MUTED}
              textAnchor={anchor as 'start' | 'middle' | 'end'}
              onPress={onPressAxis && axes[i] ? () => onPressAxis(axes[i]!, i) : undefined}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
