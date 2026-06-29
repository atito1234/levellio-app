import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';

const TEAL = colors.teal;
const MUTED = colors.textSecondary;

export interface SparkMarker {
  /** Position along the x axis, 0..1. */
  at: number;
  label: string;
}

/**
 * A small line chart for a 0..1 series (e.g. the illustrative habit-formation
 * curve). Scales to its container width via an SVG viewBox; optional markers drop
 * a dot on the line and a label beneath, placed by fraction.
 */
export function Sparkline({ values, height = 96, color = TEAL, markers = [] }: { values: readonly number[]; height?: number; color?: string; markers?: readonly SparkMarker[] }) {
  const n = values.length;
  const points = values
    .map((v, i) => `${(n <= 1 ? 0 : (i / (n - 1)) * 100).toFixed(2)},${(100 - Math.max(0, Math.min(1, v)) * 100).toFixed(2)}`)
    .join(' ');

  const yAt = (at: number): number => {
    if (n <= 1) return 100 - (values[0] ?? 0) * 100;
    const x = at * (n - 1);
    const lo = Math.floor(x);
    const hi = Math.min(n - 1, lo + 1);
    const t = x - lo;
    const v = (values[lo] ?? 0) * (1 - t) + (values[hi] ?? 0) * t;
    return 100 - Math.max(0, Math.min(1, v)) * 100;
  };

  return (
    <View>
      <Svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {markers.map((m) => (
          <Circle key={m.label} cx={m.at * 100} cy={yAt(m.at)} r={3.5} fill={color} />
        ))}
      </Svg>
      {markers.length > 0 && (
        <View style={styles.labels}>
          {markers.map((m) => (
            <Text key={m.label} style={[styles.label, { left: `${m.at * 100}%` }]}>
              {m.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { height: 16, marginTop: spacing.xs },
  label: { ...typography.caption, color: MUTED, position: 'absolute', transform: [{ translateX: -16 }], fontSize: 11 },
});
