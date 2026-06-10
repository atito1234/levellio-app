import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface ChipSelectorProps<T extends string> {
  label: string;
  options: readonly ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

/** Accessible single-select chip group (radio semantics). */
export function ChipSelector<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: ChipSelectorProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const isSelected = opt.value === selected;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={opt.label}
              onPress={() => onSelect(opt.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {opt.icon ? `${opt.icon} ` : ''}
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.identity,
    backgroundColor: colors.violetSoft,
  },
  chipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.violetDeep,
  },
});
