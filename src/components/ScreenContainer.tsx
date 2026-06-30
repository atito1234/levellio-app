import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
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
  /**
   * Lift content above the on-screen keyboard so fields and submit buttons stay
   * visible while typing. Enable on any screen with text inputs. (Off by default
   * so screens with their own KeyboardAvoidingView don't double-shift.)
   */
  keyboardAvoiding?: boolean;
  style?: ViewStyle;
}

/** Consistent safe-area + padding wrapper for every screen. */
export function ScreenContainer({
  children,
  backgroundColor = colors.background,
  edges = ['top', 'bottom', 'left', 'right'],
  noPadding = false,
  keyboardAvoiding = false,
  style,
}: ScreenContainerProps) {
  const content = <View style={[styles.content, !noPadding && styles.padded, style]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
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
