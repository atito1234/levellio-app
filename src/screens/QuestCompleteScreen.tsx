import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CompanionAvatar,
  ConfettiBurst,
  HeroAvatar,
  PrimaryButton,
  ScreenContainer,
} from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getCelebrationTimings } from '@/lib/celebration';
import { levelProgress, xpForNextLevel } from '@/lib/leveling';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestComplete'>;

/**
 * The signature "viral moment" — a full-violet payoff screen with the hero,
 * an XP count-up, a progress-bar fill, a level-up flourish, and confetti.
 * Reduced motion gets a graceful static version (final values, no confetti).
 */
export function QuestCompleteScreen({ route, navigation }: Props) {
  const { t } = useTranslation('questComplete');
  const reward = route.params?.reward;
  const { character } = useGame();
  const reduced = useReducedMotion();
  const timings = getCelebrationTimings(reduced);

  const xpAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(timings.animate ? 0.7 : 1)).current;

  const needed = character ? xpForNextLevel(character.level) : 0;
  const endProgress = character ? levelProgress(character) : 0;
  const startProgress =
    character && reward && !reward.leveledUp
      ? Math.max(0, (character.xp - reward.totalXp) / needed)
      : 0;
  const barAnim = useRef(new Animated.Value(startProgress)).current;

  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    if (!reward) return;
    if (!timings.animate) {
      setDisplayXp(reward.totalXp);
      barAnim.setValue(endProgress);
      popAnim.setValue(1);
      heroScale.setValue(1);
      return;
    }

    const id = xpAnim.addListener(({ value }) => setDisplayXp(Math.round(value)));
    Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(xpAnim, { toValue: reward.totalXp, duration: timings.xpCountMs, useNativeDriver: false }),
      Animated.timing(barAnim, { toValue: endProgress, duration: timings.barFillMs, useNativeDriver: false }),
    ]).start();
    if (reward.leveledUp) {
      Animated.spring(popAnim, {
        toValue: 1,
        delay: timings.popDelayMs,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
    return () => xpAnim.removeListener(id);
  }, [reward, timings, endProgress, xpAnim, barAnim, popAnim, heroScale]);

  if (!reward || !character) {
    return (
      <ScreenContainer backgroundColor={colors.identity}>
        <View style={styles.center}>
          <Text style={styles.kicker}>{t('kicker')}</Text>
          <PrimaryButton label={t('continue')} variant="reward" onPress={() => navigation.goBack()} />
        </View>
      </ScreenContainer>
    );
  }

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const xpA11y =
    reward.bonusXp > 0 && reward.leveledUp
      ? t('xpA11yBonusLevel', { xp: reward.totalXp, bonus: reward.bonusXp, level: reward.newLevel })
      : reward.bonusXp > 0
        ? t('xpA11yBonus', { xp: reward.totalXp, bonus: reward.bonusXp })
        : reward.leveledUp
          ? t('xpA11yLevel', { xp: reward.totalXp, level: reward.newLevel })
          : t('xpA11y', { xp: reward.totalXp });

  const onShare = async () => {
    try {
      await Share.share({
        message: reward.leveledUp
          ? t('shareMessageLevel', { xp: reward.totalXp, level: reward.newLevel })
          : t('shareMessage', { xp: reward.totalXp }),
      });
    } catch {
      // user dismissed the share sheet — no-op
    }
  };

  return (
    <ScreenContainer backgroundColor={colors.identity}>
      {timings.confetti && <ConfettiBurst />}

      <View style={styles.center} accessibilityLiveRegion="polite">
        <Text style={styles.kicker}>{t('kicker')}</Text>

        {/* Hero + companion payoff */}
        <Animated.View style={[styles.heroWrap, { transform: [{ scale: heroScale }] }]}>
          <View style={styles.glow} />
          <HeroAvatar
            presentation={character.presentation}
            tier={character.tier}
            kitId={character.kitId}
            size={150}
          />
          <View style={styles.companion}>
            <CompanionAvatar stage={character.companionStage} size={56} />
          </View>
        </Animated.View>

        {/* XP count-up */}
        <View style={styles.xpBlock} accessibilityLabel={xpA11y}>
          <Text style={styles.xpValue} accessibilityElementsHidden>
            +{displayXp}
          </Text>
          <Text style={styles.xpUnit} accessibilityElementsHidden>
            {t('unit')}
          </Text>
        </View>
        {reward.bonusXp > 0 && (
          <Text style={styles.bonus} accessibilityElementsHidden>
            {t('streakBonus', { bonus: reward.bonusXp })}
          </Text>
        )}

        {/* Level-up flourish */}
        {reward.leveledUp && (
          <Animated.View
            accessibilityLabel={t('levelUpA11y', { level: reward.newLevel })}
            style={[styles.levelUp, { opacity: popAnim, transform: [{ scale: popAnim }] }]}
          >
            <Text style={styles.levelUpText}>{t('levelUp')}</Text>
            <Text style={styles.levelUpSub}>{t('level', { level: reward.newLevel })}</Text>
          </Animated.View>
        )}

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>{t('level', { level: character.level })}</Text>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(endProgress * 100) }}
          >
            <Animated.View style={[styles.fill, { width: barWidth }]} />
          </View>
          <Text style={styles.progressXp}>
            {t('progressXp', { current: character.xp, needed })}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label={t('share')} variant="action" onPress={onShare} style={styles.actionBtn} />
          <PrimaryButton
            label={t('claimReward')}
            variant="reward"
            onPress={() => navigation.goBack()}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  kicker: {
    ...typography.label,
    letterSpacing: 2,
    color: colors.textOnBrand,
    opacity: 0.85,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FFFFFF',
    opacity: 0.12,
  },
  companion: {
    position: 'absolute',
    right: -8,
    bottom: -4,
  },
  xpBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  xpValue: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.textOnBrand,
    lineHeight: 76,
  },
  xpUnit: {
    ...typography.title,
    color: colors.goldSoft,
    marginBottom: spacing.md,
  },
  bonus: {
    ...typography.label,
    color: colors.goldSoft,
  },
  levelUp: {
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  levelUpText: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelUpSub: {
    ...typography.label,
    color: colors.textPrimary,
  },
  progressWrap: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  progressLabel: {
    ...typography.label,
    color: colors.textOnBrand,
  },
  track: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: colors.gold,
  },
  progressXp: {
    ...typography.caption,
    color: colors.textOnBrand,
    opacity: 0.9,
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
