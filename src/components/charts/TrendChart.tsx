import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { spacing, typography } from '@/theme';
import { getBucketColor } from '@/lib/buckets';
import { formatDayKey } from '@/lib/dates';
import { confidenceLabel } from '@/lib/metrics/confidence';
import { niceMax, scaleY } from './chartMath';
import type { MetricPoint, MetricSeries } from '@/lib/metrics/types';

const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const TEAL = '#16C8A8';

/**
 * A line chart over a MetricSeries with a 0..nice-max y-axis, gridlines, and
 * tappable points (each point drives a CTA, e.g. open that day's review). The
 * confidence chip replaces the old time-lock — we always show the data and say
 * how much to trust it.
 */
export function TrendChart({
  series,
  height = 140,
  onPressPoint,
  daysOfData,
}: {
  series: MetricSeries;
  height?: number;
  onPressPoint?: (point: MetricPoint, index: number) => void;
  /** Day-count for the confidence chip (defaults to the series' own confidence). */
  daysOfData?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = series.points.map((p) => p.value);
  const max = niceMax(Math.max(1, ...values));
  const color = series.colorId ? getBucketColor(series.colorId).accent : TEAL;
  const plotH = height - 24; // leave room for x labels
  const xAt = (i: number) => (series.points.length <= 1 ? width / 2 : (i / (series.points.length - 1)) * width);

  const polyline = series.points.map((p, i) => `${xAt(i).toFixed(1)},${scaleY(p.value, max, plotH).toFixed(1)}`).join(' ');
  const last = series.points[series.points.length - 1]?.value ?? 0;
  const unit = series.unit ?? '';
  const a11y = `${series.label}. ${series.points.length === 0 ? 'No data yet' : `Latest ${last}${unit}`}.`;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {series.label}
        </Text>
        <Text style={styles.chip}>{daysOfData != null ? confidenceLabel(daysOfData) : series.confidence}</Text>
      </View>
      <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={a11y}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((t) => (
              <Line key={t} x1={0} y1={plotH * t} x2={width} y2={plotH * t} stroke={TRACK} strokeWidth={1} />
            ))}
            {series.points.length > 1 && (
              <Polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {series.points.map((p, i) => (
              <Circle
                key={p.dayKey}
                cx={xAt(i)}
                cy={scaleY(p.value, max, plotH)}
                r={onPressPoint ? 10 : 3.5}
                fill={onPressPoint ? 'transparent' : color}
                onPress={onPressPoint ? () => onPressPoint(p, i) : undefined}
              />
            ))}
            {onPressPoint &&
              series.points.map((p, i) => (
                <Circle key={`dot-${p.dayKey}`} cx={xAt(i)} cy={scaleY(p.value, max, plotH)} r={3.5} fill={color} />
              ))}
          </Svg>
        )}
      </View>
      {series.points.length > 0 && (
        <View style={styles.axis}>
          <Text style={styles.tick}>{formatDayKey(series.points[0]!.dayKey)}</Text>
          <Text style={styles.tick}>{formatDayKey(series.points[series.points.length - 1]!.dayKey)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  title: { ...typography.label, flexShrink: 1 },
  chip: { ...typography.caption, color: MUTED, fontSize: 10 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tick: { ...typography.caption, color: MUTED, fontSize: 10 },
});
