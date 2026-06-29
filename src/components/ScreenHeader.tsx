/**
 * ScreenHeader — the shared modal/screen top bar (back chevron + centered title +
 * optional right slot). Extracted so every screen reads with the same rhythm as
 * the app's redesigned surfaces; replaces the per-screen inline "topbar".
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Back',
  right,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        )}
      </View>
      {title ? (
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <View />
      )}
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.sm },
  side: { minWidth: 32, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  chevron: { fontSize: 30, lineHeight: 30, color: colors.textPrimary, width: 28 },
  title: { ...typography.heading, color: colors.textPrimary, flex: 1, textAlign: 'center' },
});
