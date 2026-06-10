import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components';
import { colors, spacing, typography } from '@/theme';

interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
  /** Which build day delivers the full screen. */
  comingOn: string;
}

/**
 * Lightweight placeholder for screens not built today (Days 5-8).
 * Keeps the navigation shell fully wired and runnable.
 */
export function PlaceholderScreen({ title, subtitle, comingOn }: PlaceholderScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{comingOn}</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  badge: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.violetSoft,
  },
  badgeText: {
    ...typography.label,
    color: colors.violetDeep,
  },
});
