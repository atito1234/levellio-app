import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '@/theme';

// Locked palette (gold reserved for 100% rings — never on a partial bar).
const INK = '#1F2937';
const MUTED = '#5A5A72';
const TEAL = '#16C8A8';
const VIOLET = '#6C4CF1';
const TRACK = '#ECEAE4';

export type BarTone = 'violet' | 'teal';
const COLOR: Record<BarTone, string> = { violet: VIOLET, teal: TEAL };

export interface BarDatum {
  key: string;
  label: string;
  /** Numeric magnitude (drives bar width relative to the max). */
  value: number;
  /** Pre-formatted value shown at the row end, e.g. "1h 20m". */
  display: string;
  tone?: BarTone;
  icon?: string;
}

/**
 * Minimal labeled horizontal bar chart over plain data (no internal math beyond
 * normalizing to the row max). Each row is self-describing for screen readers.
 */
export function HBarChart({ data, barHeight = 12 }: { data: readonly BarDatum[]; barHeight?: number }) {
  const { t } = useTranslation('charts');
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={styles.wrap}>
      {data.map((d) => {
        const pct = d.value > 0 ? Math.max(6, Math.round((d.value / max) * 100)) : 0;
        return (
          <View
            key={d.key}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={t('hBarChart.row', { label: d.label, display: d.display })}
          >
            <View style={styles.head}>
              <Text style={styles.label} numberOfLines={1}>
                {d.icon ? `${d.icon} ` : ''}
                {d.label}
              </Text>
              <Text style={styles.value}>{d.display}</Text>
            </View>
            <View style={[styles.track, { height: barHeight }]}>
              {pct > 0 && (
                <View style={[styles.fill, { width: `${pct}%`, height: barHeight, backgroundColor: COLOR[d.tone ?? 'teal'] }]} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  label: { ...typography.body, color: INK, fontWeight: '600', flex: 1 },
  value: { ...typography.caption, color: MUTED, fontWeight: '700' },
  track: { backgroundColor: TRACK, borderRadius: 999, overflow: 'hidden' },
  fill: { borderRadius: 999 },
});
