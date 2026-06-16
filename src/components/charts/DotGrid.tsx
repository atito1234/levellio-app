import React from 'react';
import { StyleSheet, View } from 'react-native';

// Locked palette (gold reserved for reward/100% — never for routine dots).
const TEAL = '#16C8A8';
const TRACK = '#ECEAE4';
const VIOLET = '#6C4CF1';

export interface DotCell {
  done: boolean;
  isToday?: boolean;
}

/**
 * A compact "past days" grid — one dot per day, filled (teal) when the activity
 * was done, faint (track) when missed; today gets a violet ring. Honest at a
 * glance: it only reflects real completion days. Mirrors the heatmap grid idea
 * from MonthlyProgressScreen but tiny and per-activity.
 */
export function DotGrid({ cells, size = 14, doneColor = TEAL }: { cells: readonly DotCell[]; size?: number; doneColor?: string }) {
  const doneCount = cells.filter((c) => c.done).length;
  return (
    <View
      style={styles.grid}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${doneCount} of the last ${cells.length} days done`}
    >
      {cells.map((c, i) => (
        <View
          key={i}
          style={[
            { width: size, height: size, borderRadius: size / 2 },
            { backgroundColor: c.done ? doneColor : TRACK },
            c.isToday ? { borderWidth: 2, borderColor: VIOLET } : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dot: {},
});
