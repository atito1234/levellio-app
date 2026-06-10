import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import type { QuestDifficulty } from '@/types';

const STYLES: Record<QuestDifficulty, { bg: string; fg: string; label: string }> = {
  easy: { bg: colors.tealSoft, fg: colors.tealDeep, label: 'Easy' },
  medium: { bg: colors.goldSoft, fg: colors.goldDeep, label: 'Medium' },
  hard: { bg: colors.violetSoft, fg: colors.violetDeep, label: 'Hard' },
};

interface DifficultyBadgeProps {
  difficulty: QuestDifficulty;
}

/** Small colored pill conveying quest difficulty. */
export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const s = STYLES[difficulty];
  return (
    <View
      style={[styles.badge, { backgroundColor: s.bg }]}
      accessibilityLabel={`Difficulty: ${s.label}`}
    >
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
