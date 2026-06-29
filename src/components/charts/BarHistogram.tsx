import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '@/theme';

const MUTED = colors.textSecondary;
const TEAL = colors.teal;
const VIOLET = colors.violet;
const TRACK = colors.track;
const MAX_H = 96;

export interface HistogramBar {
  label: string;
  value: number;
  /** Optional override colour (else teal, peak highlighted violet). */
  color?: string;
}

/**
 * Labelled vertical bars for a distribution (misses-by-weekday, minutes-by-
 * category, durations…). The peak is highlighted (von Restorff). Bars are
 * tappable so each can drive a CTA (e.g. tap a gap weekday → schedule it).
 */
export function BarHistogram({
  bars,
  onPressBar,
  highlightPeak = true,
}: {
  bars: readonly HistogramBar[];
  onPressBar?: (bar: HistogramBar, index: number) => void;
  highlightPeak?: boolean;
}) {
  const { t } = useTranslation('charts');
  const max = Math.max(1, ...bars.map((b) => b.value));
  const peak = bars.reduce((best, b, i) => (b.value > (bars[best]?.value ?? -1) ? i : best), 0);
  const peakHasData = (bars[peak]?.value ?? 0) > 0;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={t('barHistogram.summary', { count: bars.length })}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants">
        {bars.map((b, i) => {
          const h = b.value > 0 ? Math.max(4, Math.round((b.value / max) * MAX_H)) : 2;
          const isPeak = highlightPeak && peakHasData && i === peak;
          const fill = b.value === 0 ? TRACK : b.color ?? (isPeak ? VIOLET : TEAL);
          const Bar = (
            <View style={styles.col}>
              <Text style={styles.value} numberOfLines={1}>
                {b.value > 0 ? b.value : ''}
              </Text>
              <View style={[styles.bar, { height: h, backgroundColor: fill }]} />
              <Text style={styles.tick} numberOfLines={1}>
                {b.label}
              </Text>
            </View>
          );
          return onPressBar ? (
            <Pressable
              key={`${b.label}-${i}`}
              style={styles.colWrap}
              onPress={() => onPressBar(b, i)}
              accessibilityRole="button"
              accessibilityLabel={t('barHistogram.bar', { label: b.label, value: b.value })}
            >
              {Bar}
            </Pressable>
          ) : (
            <View key={`${b.label}-${i}`} style={styles.colWrap}>
              {Bar}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  colWrap: { flex: 1 },
  col: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: 5 },
  value: { ...typography.caption, color: MUTED, fontSize: 11, marginBottom: 2 },
  tick: { ...typography.caption, color: MUTED, fontSize: 11, marginTop: 4 },
});
