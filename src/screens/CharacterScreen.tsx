import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CapacityRing,
  CompanionAvatar,
  HeroAvatar,
  PrimaryButton,
  ProgressBar,
  ScreenContainer,
  StatPill,
} from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useCommunity } from '@/state/CommunityContext';
import { CAPACITIES } from '@/lib/compounding';
import { getKit } from '@/data/worldCupKits';
import type { RootStackParamList } from '@/navigation/types';
import {
  TIER_ORDER,
  TIER_START_LEVEL,
  levelProgress,
  levelsToNextTier,
  lifetimeXp,
} from '@/lib/leveling';
import type { HeroTier } from '@/types';

/** Day-5 character screen: hero variant, Wisp companion, and tier progression. */
export function CharacterScreen() {
  const { t } = useTranslation('hero');
  const tierLabel = (tier: HeroTier) => t(`tier.${tier}`);
  const capName = (id: string) => t(`capacities:${id}`);
  const { character } = useGame();
  const { levels } = useCapacities();
  const { uid: communityUid } = useCommunity();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
          <HeroAvatar
            presentation={character.presentation}
            tier={character.tier}
            kitId={character.kitId}
            size={180}
          />
          <Text style={styles.name}>{character.name}</Text>
          <View style={styles.tierChip}>
            <Text style={styles.tierChipText}>{tierLabel(character.tier)}</Text>
          </View>
        </View>

        {/* Kit customization */}
        <View style={styles.card}>
          <View style={styles.kitHead}>
            <Text style={styles.cardTitle}>{t('kitTitle')}</Text>
            <Text style={styles.kitCurrent}>{getKit(character.kitId)?.nationName ?? t('kitClassic')}</Text>
          </View>
          <PrimaryButton
            label={t('changeKit')}
            variant="action"
            onPress={() => navigation.navigate('KitSelect')}
          />
        </View>

        <View style={styles.stats}>
          <StatPill icon="⭐" value={`${character.level}`} label={t('level')} tint={colors.identity} />
          <StatPill
            icon="✨"
            value={`${lifetimeXp(character)}`}
            label={t('totalXp')}
            tint={colors.gold}
          />
        </View>

        {/* Habit analytics — reflect on direction, unlock insights with days done */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('analyticsTitle')}</Text>
          <Text style={styles.analyticsHint}>{t('analyticsHint')}</Text>
          <PrimaryButton
            label={t('seeProgress')}
            variant="primary"
            onPress={() => navigation.navigate('Progress')}
          />
          {communityUid && (
            <PrimaryButton
              label={t('viewProfile')}
              variant="ghost"
              onPress={() => navigation.navigate('Profile', { uid: communityUid })}
            />
          )}
        </View>

        {/* Your capacities — the shared rings every completion feeds (moved here
            from Today to keep the home screen calm). */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('capacitiesTitle')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capStrip}>
            {CAPACITIES.map((cap) => {
              const lvl = Math.round(levels[cap.id]);
              return (
                <Pressable
                  key={cap.id}
                  onPress={() => navigation.navigate('CapacityFocus', { capacityId: cap.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${capName(cap.id)} ${lvl}%`}
                  style={styles.capCell}
                >
                  <View style={styles.capRingWrap}>
                    <CapacityRing level={lvl} colorId={cap.colorId} size={56} strokeWidth={6} />
                    <View style={styles.capRingCenter} pointerEvents="none">
                      <Text style={styles.capRingPct}>{lvl}%</Text>
                    </View>
                  </View>
                  <Text style={styles.capCellName}>{capName(cap.id)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Companion */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('wispTitle')}</Text>
          <View style={styles.companionRow}>
            <CompanionAvatar stage={character.companionStage} size={88} />
            <View style={styles.companionInfo}>
              <Text style={styles.companionStage}>
                {t(`companion.${character.companionStage}`)}
              </Text>
              <Text style={styles.companionHint}>{t('wispHint')}</Text>
            </View>
          </View>
        </View>

        {/* Tier progression */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tierProgressTitle')}</Text>
          <ProgressBar
            progress={tierProgress}
            color={colors.identity}
            label={t('progressToNextTier')}
            height={14}
          />
          <Text style={styles.progressText}>
            {nextTier && remaining !== null
              ? t(remaining === 1 ? 'toNext_one' : 'toNext_other', { count: remaining, tier: tierLabel(nextTier) })
              : t('topReached')}
          </Text>
        </View>

        {/* Tier journey — all three hero tiers, current one highlighted */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('journeyTitle')}</Text>
          <View style={styles.journeyRow}>
            {TIER_ORDER.map((tier) => {
              const active = tier === character.tier;
              return (
                <View
                  key={tier}
                  style={[styles.journeyItem, active && styles.journeyItemActive]}
                  accessibilityLabel={tierLabel(tier)}
                >
                  <HeroAvatar
                    presentation={character.presentation}
                    tier={tier}
                    kitId={character.kitId}
                    size={72}
                  />
                  <Text style={[styles.journeyLabel, active && styles.journeyLabelActive]}>
                    {tierLabel(tier)}
                  </Text>
                </View>
              );
            })}
          </View>
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
  capStrip: { gap: spacing.md },
  capCell: { alignItems: 'center', gap: 4, width: 64 },
  capRingWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  capRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  capRingPct: { ...typography.caption, color: colors.textPrimary, fontWeight: '800', fontSize: 11 },
  capCellName: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  kitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kitCurrent: {
    ...typography.label,
    color: colors.violetDeep,
  },
  analyticsHint: {
    ...typography.body,
    color: colors.textSecondary,
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
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  journeyItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    opacity: 0.55,
  },
  journeyItemActive: {
    opacity: 1,
  },
  journeyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  journeyLabelActive: {
    color: colors.violetDeep,
    fontWeight: '700',
  },
});
