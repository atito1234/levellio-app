import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

/** A small "✦ Founder/Plus" flair pill shown on profiles + posts. */
export function PlusBadge({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <View style={[styles.badge, small && styles.badgeSmall]} accessibilityLabel={label}>
      <Text style={[styles.text, small && styles.textSmall]}>✦ {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: colors.violetSoft, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 1 },
  text: { ...typography.caption, color: colors.violetDeep, fontWeight: '800' },
  textSmall: { fontSize: 10 },
});
