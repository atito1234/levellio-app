import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { getBucketColor, type BucketColorId } from '@/lib/buckets';
import { radialPositions, type Pt } from './chartMath';

const MUTED = '#5A5A72';
const TRACK = '#D6D6E0';
const VIOLET = '#6C4CF1';

export interface MapNode {
  id: string;
  label: string;
  colorId?: BucketColorId;
  /** 0..1 — emphasis (e.g. adherence); scales the node radius. */
  weight?: number;
}

/**
 * A lightweight mind-map / relationship graph: one central node (a goal or
 * capacity) ringed by the nodes that connect to it (its habits). Pure radial
 * layout — no physics — so it renders identically with reduced motion. Nodes are
 * tappable to focus that item (the CTA).
 */
export function RelationshipMap({
  center,
  nodes,
  size = 260,
  onPressNode,
}: {
  center: MapNode;
  nodes: readonly MapNode[];
  size?: number;
  onPressNode?: (node: MapNode) => void;
}) {
  const [w, setW] = useState(size);
  const onLayout = (e: LayoutChangeEvent) => setW(Math.min(size, e.nativeEvent.layout.width));
  const dim = Math.max(160, w);
  const c: Pt = { x: dim / 2, y: dim / 2 };
  const radius = dim / 2 - 34;
  const positions = radialPositions(nodes.length, c, radius);
  const a11y = `${center.label} connected to ${nodes.map((n) => n.label).join(', ')}.`;

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11y}>
      <Svg width={dim} height={dim}>
        {positions.map((p, i) => (
          <Line key={`e-${i}`} x1={c.x} y1={c.y} x2={p.x} y2={p.y} stroke={TRACK} strokeWidth={1.5} />
        ))}
        {positions.map((p, i) => {
          const n = nodes[i]!;
          const accent = n.colorId ? getBucketColor(n.colorId).accent : VIOLET;
          const r = 16 + (n.weight ?? 0.4) * 10;
          return (
            <G key={n.id} onPress={onPressNode ? () => onPressNode(n) : undefined}>
              <Circle cx={p.x} cy={p.y} r={r} fill={accent} fillOpacity={0.18} stroke={accent} strokeWidth={2} />
              <SvgText x={p.x} y={p.y + r + 12} fontSize={10} fill={MUTED} textAnchor="middle">
                {truncate(n.label)}
              </SvgText>
            </G>
          );
        })}
        <Circle cx={c.x} cy={c.y} r={28} fill={center.colorId ? getBucketColor(center.colorId).accent : VIOLET} />
        <SvgText x={c.x} y={c.y + 4} fontSize={11} fill="#FFFFFF" textAnchor="middle" fontWeight="600">
          {truncate(center.label, 10)}
        </SvgText>
      </Svg>
    </View>
  );
}

function truncate(s: string, n = 12): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
