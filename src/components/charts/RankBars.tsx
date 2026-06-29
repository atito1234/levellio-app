import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '@/theme';

const MUTED = colors.textSecondary;
const UP = colors.teal; // teal — improving
const DOWN = colors.danger; // danger — slipping
const TRACK = colors.track;

export interface RankRow {
  id: string;
  label: string;
  /** Signed delta (e.g. week-over-week adherence change, −100..100). */
  delta: number;
}

/**
 * Diverging horizontal bars of signed deltas — the "top movers". Improvements
 * grow right in teal, regressions left in danger. Each row is tappable to open
 * the group's detail (the CTA).
 */
export function RankBars({ rows, onPressRow }: { rows: readonly RankRow[]; onPressRow?: (row: RankRow) => void }) {
  const { t } = useTranslation('charts');
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.delta)));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('rankBars.summary', { count: rows.length })}
    >
      {rows.map((r) => {
        const frac = Math.abs(r.delta) / maxAbs;
        const up = r.delta >= 0;
        const sign = r.delta > 0 ? '+' : '';
        const Row = (
          <View style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {r.label}
            </Text>
            <View style={styles.track}>
              <View style={styles.center} />
              <View
                style={[
                  styles.fill,
                  up ? { left: '50%', backgroundColor: UP } : { right: '50%', backgroundColor: DOWN },
                  { width: `${(frac * 50).toFixed(1)}%` as `${number}%` },
                ]}
              />
            </View>
            <Text style={[styles.delta, { color: r.delta === 0 ? MUTED : up ? UP : DOWN }]}>
              {sign}
              {r.delta}
            </Text>
          </View>
        );
        return onPressRow ? (
          <Pressable
            key={r.id}
            onPress={() => onPressRow(r)}
            accessibilityRole="button"
            accessibilityLabel={t('rankBars.row', { label: r.label, delta: `${sign}${r.delta}` })}
          >
            {Row}
          </Pressable>
        ) : (
          <View key={r.id}>{Row}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  label: { ...typography.caption, width: 96, flexShrink: 0 },
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: TRACK, overflow: 'hidden', justifyContent: 'center' },
  center: { position: 'absolute', left: '50%', width: 1, top: 0, bottom: 0, backgroundColor: '#D6D6E0' },
  fill: { position: 'absolute', height: 14, borderRadius: 7 },
  delta: { ...typography.caption, width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
