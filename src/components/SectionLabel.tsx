/**
 * SectionLabel — the small, muted, letter-spaced section caption used across the
 * app (e.g. "YOUR TROPHIES", "ARMORY"). One source of truth for the look.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/theme';

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: { ...typography.label, color: colors.textMuted, letterSpacing: 2, marginTop: spacing.sm },
});
