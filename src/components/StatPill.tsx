import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

interface StatPillProps {
  icon: string;
  value: string;
  label: string;
  tint?: string;
}

/** Compact icon + value chip used for streaks, totals, etc. */
export function StatPill({ icon, value, label, tint = colors.identity }: StatPillProps) {
  return (
    <View style={styles.pill} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.icon, { color: tint }]}>{icon}</Text>
      <View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 20,
  },
  value: {
    ...typography.label,
    color: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
