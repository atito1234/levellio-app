import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { getBucketColor, type BucketColorId } from '@/lib/buckets';
import { weekdayOfKey } from '@/lib/recurrence';
import { intensityLevel } from './chartMath';
import type { MetricPoint } from '@/lib/metrics/types';

const MUTED = '#5A5A72';
const EMPTY = '#ECEAE4';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * A GitHub-style calendar heatmap over a metric's daily points, laid out as
 * weekday rows × week columns. Cell opacity encodes intensity; cells are
 * tappable so a day drives a CTA (e.g. open that day's review).
 */
export function CalendarHeatmap({
  points,
  colorId = 'teal',
  onPressDay,
}: {
  points: readonly MetricPoint[];
  colorId?: BucketColorId;
  onPressDay?: (point: MetricPoint) => void;
}) {
  const accent = getBucketColor(colorId).accent;
  const byDay = new Map(points.map((p) => [p.dayKey, p.value]));
  const max = Math.max(1, ...points.map((p) => p.value));

  // Order by date and group into week columns (Sun-started).
  const sorted = [...points].sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1));
  const columns: (MetricPoint | null)[][] = [];
  let col: (MetricPoint | null)[] = new Array(7).fill(null);
  let started = false;
  for (const p of sorted) {
    const wd = weekdayOfKey(p.dayKey);
    if (started && wd === 0) {
      columns.push(col);
      col = new Array(7).fill(null);
    }
    col[wd] = p;
    started = true;
  }
  if (started) columns.push(col);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Calendar heatmap of ${points.length} days.`}
    >
      <View style={styles.labels} importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid} importantForAccessibility="no-hide-descendants">
        {columns.map((column, ci) => (
          <View key={ci} style={styles.column}>
            {column.map((p, ri) => {
              const value = p ? byDay.get(p.dayKey) ?? 0 : 0;
              const level = p ? intensityLevel(value, max, 4) : 0;
              const bg = level === 0 ? EMPTY : accent;
              const cell = <View style={[styles.cell, { backgroundColor: bg, opacity: level === 0 ? 1 : 0.25 + level * 0.1875 }]} />;
              return p && onPressDay ? (
                <Pressable key={ri} onPress={() => onPressDay(p)} accessibilityRole="button" accessibilityLabel={`${p.dayKey}: ${value}`}>
                  {cell}
                </Pressable>
              ) : (
                <View key={ri}>{cell}</View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL = 14;
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.xs },
  labels: { justifyContent: 'space-between' },
  weekday: { ...typography.caption, color: MUTED, fontSize: 9, height: CELL, lineHeight: CELL },
  grid: { flexDirection: 'row', gap: 3, flex: 1, flexWrap: 'wrap' },
  column: { gap: 3 },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
});
