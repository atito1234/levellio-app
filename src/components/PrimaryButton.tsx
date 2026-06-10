import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

type Variant = 'primary' | 'action' | 'reward' | 'ghost';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

/**
 * Brand-aware button.
 *   primary -> violet (identity/progress)
 *   action  -> teal   (action/completion)
 *   ghost   -> outlined
 */
export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const isGhost = variant === 'ghost';
  const bg =
    variant === 'action'
      ? colors.action
      : variant === 'reward'
        ? colors.reward
        : variant === 'primary'
          ? colors.identity
          : 'transparent';
  // Gold needs dark text for contrast; ghost uses brand violet.
  const textColor = isGhost
    ? colors.identity
    : variant === 'reward'
      ? colors.textPrimary
      : colors.textOnBrand;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    borderWidth: 2,
    borderColor: colors.identity,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...typography.label,
    fontSize: 16,
  },
});
