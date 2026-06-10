import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Override the default neutral light background. */
  backgroundColor?: string;
  /** Safe-area edges to apply. Defaults to all. */
  edges?: readonly Edge[];
  /** Remove default horizontal padding (e.g. full-bleed screens). */
  noPadding?: boolean;
  style?: ViewStyle;
}

/** Consistent safe-area + padding wrapper for every screen. */
export function ScreenContainer({
  children,
  backgroundColor = colors.background,
  edges = ['top', 'bottom', 'left', 'right'],
  noPadding = false,
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      <View style={[styles.content, !noPadding && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.xl,
  },
});
