import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { levelProgress, xpForNextLevel } from '@/lib/leveling';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestComplete'>;

const XP_COUNT_MS = 900;
const BAR_FILL_MS = 800;

/**
 * The signature celebration moment. Animates an XP count-up and a progress-bar
 * fill, with a special level-up state when a level is crossed. Honors the
 * "Reduce Motion" setting by snapping straight to the final values.
 */
export function QuestCompleteScreen({ route, navigation }: Props) {
  const reward = route.params?.reward;
  const { character } = useGame();
  const reduced = useReducedMotion();

  const xpAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  // Where the XP bar starts/ends within the current level.
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
    if (reduced) {
      setDisplayXp(reward.totalXp);
      barAnim.setValue(endProgress);
      popAnim.setValue(1);
      return;
    }

    const id = xpAnim.addListener(({ value }) => setDisplayXp(Math.round(value)));
    Animated.sequence([
      Animated.timing(xpAnim, {
        toValue: reward.totalXp,
        duration: XP_COUNT_MS,
        useNativeDriver: false,
      }),
      Animated.timing(barAnim, {
        toValue: endProgress,
        duration: BAR_FILL_MS,
        useNativeDriver: false,
      }),
    ]).start();

    if (reward.leveledUp) {
      Animated.spring(popAnim, {
        toValue: 1,
        delay: XP_COUNT_MS + BAR_FILL_MS,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }

    return () => xpAnim.removeListener(id);
    // Run once per reward; reduced-motion changes re-run to snap values.
  }, [reduced, reward, endProgress, xpAnim, barAnim, popAnim]);

  if (!reward || !character) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.heading}>Quest Complete!</Text>
          <PrimaryButton label="Continue" variant="reward" onPress={() => navigation.goBack()} />
        </View>
      </ScreenContainer>
    );
  }

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const xpA11y = `You earned ${reward.totalXp} XP${
    reward.bonusXp > 0 ? `, including a ${reward.bonusXp} XP streak bonus` : ''
  }`;

  return (
    <ScreenContainer>
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Text style={styles.kicker}>QUEST COMPLETE</Text>

        {/* XP count-up */}
        <View style={styles.xpBlock} accessibilityLabel={xpA11y}>
          <Text style={styles.xpValue} accessibilityElementsHidden>
            +{displayXp}
          </Text>
          <Text style={styles.xpUnit} accessibilityElementsHidden>
            XP
          </Text>
        </View>
        {reward.bonusXp > 0 && (
          <Text style={styles.bonus} accessibilityElementsHidden>
            🔥 Includes +{reward.bonusXp} streak bonus
          </Text>
        )}

        {/* Level-up state */}
        {reward.leveledUp && (
          <Animated.View
            accessibilityLabel={`Level up! You reached level ${reward.newLevel}`}
            style={[
              styles.levelUp,
              { opacity: popAnim, transform: [{ scale: popAnim }] },
            ]}
          >
            <Text style={styles.levelUpText}>LEVEL UP!</Text>
            <Text style={styles.levelUpSub}>Level {reward.newLevel}</Text>
          </Animated.View>
        )}

        {/* Progress bar fill */}
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>Level {character.level}</Text>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(endProgress * 100) }}
          >
            <Animated.View style={[styles.fill, { width: barWidth }]} />
          </View>
          <Text style={styles.progressXp}>
            {character.xp} / {needed} XP
          </Text>
        </View>

        <PrimaryButton
          label="Claim reward"
          variant="reward"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
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
  heading: {
    ...typography.heading,
    color: colors.tealDeep,
    marginBottom: spacing.lg,
  },
  kicker: {
    ...typography.label,
    letterSpacing: 2,
    color: colors.tealDeep,
  },
  xpBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  xpValue: {
    fontSize: 72,
    fontWeight: '800',
    // goldDeep ink keeps the gold "reward" identity while meeting AA on light.
    color: colors.goldDeep,
    lineHeight: 76,
  },
  xpUnit: {
    ...typography.title,
    color: colors.goldDeep,
    marginBottom: spacing.md,
  },
  bonus: {
    ...typography.label,
    color: colors.goldDeep,
  },
  levelUp: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.sm,
    ...shadows.md,
  },
  levelUpText: {
    ...typography.title,
    color: colors.goldDeep,
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
    marginTop: spacing.lg,
  },
  progressLabel: {
    ...typography.label,
    color: colors.violetDeep,
  },
  track: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.violetSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: colors.progress,
  },
  progressXp: {
    ...typography.caption,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
  },
  button: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
});
