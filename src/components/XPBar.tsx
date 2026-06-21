import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '@/theme';
import { ProgressBar } from './ProgressBar';
import { levelProgress, xpForNextLevel } from '@/lib/leveling';
import type { Character, HeroTier } from '@/types';

/** English fallbacks used when i18n is not yet initialized (e.g. in tests). */
const TIER_LABEL: Record<HeroTier, string> = {
  novice: 'Novice',
  pathfinder: 'Pathfinder',
  luminary: 'Luminary',
};

interface XPBarProps {
  character: Pick<Character, 'level' | 'xp' | 'tier'>;
}

/** Level + tier header with an XP progress bar to the next level. */
export function XPBar({ character }: XPBarProps) {
  const { t } = useTranslation('charts');
  const needed = xpForNextLevel(character.level);
  const progress = levelProgress(character);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelChip}>
          <Text style={styles.levelChipText}>{t('lvlShort', { defaultValue: 'LVL' })} {character.level}</Text>
        </View>
        <Text style={styles.tier}>
          {t(`hero.tierLabel.${character.tier}`, { defaultValue: TIER_LABEL[character.tier] })}
        </Text>
      </View>
      <ProgressBar progress={progress} label={t('xpProgress', { defaultValue: 'XP progress to next level' })} />
      <Text
        style={styles.xpText}
        accessibilityLabel={t('xp', { xp: character.xp, needed, defaultValue: `${character.xp} of ${needed} XP` })}
      >
        {character.xp} / {needed} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelChip: {
    backgroundColor: colors.identity,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  levelChipText: {
    ...typography.label,
    color: colors.textOnBrand,
  },
  tier: {
    ...typography.label,
    color: colors.violetDeep,
  },
  xpText: {
    ...typography.caption,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
  },
});
