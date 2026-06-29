/**
 * EmptyState — one consistent empty/placeholder look for analytics surfaces
 * (a large emoji over a centered, muted message).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { A, spacing, typography } from '@/theme';

export function AnalyticsEmptyState({ emoji = '📈', message }: { emoji?: string; message: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  emoji: { fontSize: 44 },
  message: { ...typography.body, color: A.muted, textAlign: 'center' },
});
