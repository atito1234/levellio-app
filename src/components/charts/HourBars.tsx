import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { hourLabel } from '@/lib/analytics';

// Locked palette (gold reserved for 100% rings — never here).
const MUTED = '#5A5A72';
const TEAL = '#16C8A8';
const VIOLET = '#6C4CF1';
const TRACK = '#ECEAE4';

const AXIS = [0, 6, 12, 18, 23];
const MAX_H = 64;

/**
 * 24 slim vertical bars showing when activity happened across the day. The peak
 * hour is highlighted (von Restorff) in violet; other active hours are teal.
 * `counts` is the byHour[24] array from analytics.summarize.
 */
export function HourBars({ counts }: { counts: readonly number[] }) {
  const max = Math.max(1, ...counts);
  const peak = counts.reduce((best, c, i) => (c > (counts[best] ?? -1) ? i : best), 0);
  const peakHasData = (counts[peak] ?? 0) > 0;
  const summary = peakHasData ? `Most active around ${hourLabel(peak)}` : 'No activity logged';

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Time of day activity. ${summary}.`}>
      <View style={styles.bars} importantForAccessibility="no-hide-descendants">
        {counts.map((c, h) => {
          const height = c > 0 ? Math.max(4, Math.round((c / max) * MAX_H)) : 2;
          const isPeak = peakHasData && c === max;
          return (
            <View key={h} style={styles.col}>
              <View style={[styles.bar, { height, backgroundColor: c === 0 ? TRACK : isPeak ? VIOLET : TEAL }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {AXIS.map((h) => (
          <Text key={h} style={styles.tick}>
            {hourLabel(h).replace(' ', '').toLowerCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: MAX_H, gap: 2 },
  col: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 3, width: '100%' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tick: { ...typography.caption, color: MUTED, fontSize: 10 },
});
