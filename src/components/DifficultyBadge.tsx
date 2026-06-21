import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, typography } from '@/theme';
import type { QuestDifficulty } from '@/types';

const STYLES: Record<QuestDifficulty, { bg: string; fg: string }> = {
  easy: { bg: colors.tealSoft, fg: colors.tealDeep },
  medium: { bg: colors.goldSoft, fg: colors.goldDeep },
  hard: { bg: colors.violetSoft, fg: colors.violetDeep },
};

interface DifficultyBadgeProps {
  difficulty: QuestDifficulty;
}

/** Small colored pill conveying quest difficulty. */
export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { t } = useTranslation('quests');
  const s = STYLES[difficulty];
  const label = t(`diff.${difficulty}`);
  return (
    <View
      style={[styles.badge, { backgroundColor: s.bg }]}
      accessibilityLabel={t('diffA11y', { label })}
    >
      <Text style={[styles.text, { color: s.fg }]}>{label}</Text>
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
