import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CompanionAvatar,
  HeroAvatar,
  ProgressBar,
  ScreenContainer,
  StatPill,
} from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import {
  TIER_ORDER,
  TIER_START_LEVEL,
  levelProgress,
  levelsToNextTier,
  lifetimeXp,
} from '@/lib/leveling';
import type { CompanionStage, HeroTier } from '@/types';

const TIER_LABEL: Record<HeroTier, string> = {
  novice: 'Novice',
  pathfinder: 'Pathfinder',
  luminary: 'Luminary',
};

const COMPANION_LABEL: Record<CompanionStage, string> = {
  spark: 'Spark',
  ember: 'Ember',
  phoenixling: 'Phoenixling',
};

/** Day-5 character screen: hero variant, Wisp companion, and tier progression. */
export function CharacterScreen() {
  const { character } = useGame();

  if (!character) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.identity} />
        </View>
      </ScreenContainer>
    );
  }

  const tierIndex = TIER_ORDER.indexOf(character.tier);
  const nextTier = TIER_ORDER[tierIndex + 1];
  const tierStart = TIER_START_LEVEL[character.tier];
  const remaining = levelsToNextTier(character.level);

  // Smooth progress across the current tier band (level + within-level XP).
  const tierProgress = nextTier
    ? (character.level - tierStart + levelProgress(character)) /
      (TIER_START_LEVEL[nextTier] - tierStart)
    : 1;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroBlock}>
          <HeroAvatar presentation={character.presentation} tier={character.tier} size={180} />
          <Text style={styles.name}>{character.name}</Text>
          <View style={styles.tierChip}>
            <Text style={styles.tierChipText}>{TIER_LABEL[character.tier]}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <StatPill icon="⭐" value={`${character.level}`} label="Level" tint={colors.identity} />
          <StatPill
            icon="✨"
            value={`${lifetimeXp(character)}`}
            label="Total XP"
            tint={colors.gold}
          />
        </View>

        {/* Companion */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Wisp</Text>
          <View style={styles.companionRow}>
            <CompanionAvatar stage={character.companionStage} size={88} />
            <View style={styles.companionInfo}>
              <Text style={styles.companionStage}>
                {COMPANION_LABEL[character.companionStage]}
              </Text>
              <Text style={styles.companionHint}>
                Your companion evolves as your hero rises through the tiers.
              </Text>
            </View>
          </View>
        </View>

        {/* Tier progression */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tier Progression</Text>
          <ProgressBar
            progress={tierProgress}
            color={colors.identity}
            label="Progress to next tier"
            height={14}
          />
          <Text style={styles.progressText}>
            {nextTier && remaining !== null
              ? `${remaining} ${remaining === 1 ? 'level' : 'levels'} to ${TIER_LABEL[nextTier]}`
              : 'Top tier reached — you are a Luminary!'}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'stretch',
  },
  heroBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  tierChip: {
    backgroundColor: colors.violetSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  tierChipText: {
    ...typography.label,
    color: colors.violetDeep,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  companionInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  companionStage: {
    ...typography.title,
    color: colors.tealDeep,
  },
  companionHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
