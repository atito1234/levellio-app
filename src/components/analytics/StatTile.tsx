/**
 * StatTile — the canonical "big number + label" cell used by every analytics
 * stat cluster (Analytics counters, Insights summary, ActivityJourney stats).
 * One look everywhere: a large, extra-bold value over a muted caption.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { A } from '@/theme';

export function StatTile({ value, label, tint = A.ink }: { value: string; label: string; tint?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  value: { fontSize: 30, lineHeight: 34, fontWeight: '800' },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '500', color: A.muted, textAlign: 'center' },
});
