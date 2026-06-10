import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { DifficultyBadge } from './DifficultyBadge';
import { awardedXp } from '@/lib/leveling';
import { CATEGORY_META } from '@/lib/categories';
import type { Quest } from '@/types';

interface QuestCardProps {
  quest: Quest;
  /** Current streak, used to preview the bonus-adjusted XP. */
  streakDays: number;
  onComplete: (questId: string) => void;
  /** Optional: tap the quest body to edit it. */
  onEdit?: (questId: string) => void;
}

/** A single quest row with difficulty, XP reward, and a complete action. */
export function QuestCard({ quest, streakDays, onComplete, onEdit }: QuestCardProps) {
  const reward = awardedXp(quest.baseXp, streakDays);
  const done = quest.completed;

  const body = (
    <View style={styles.main}>
      <Text style={styles.icon} accessibilityElementsHidden>
        {CATEGORY_META[quest.category].icon}
      </Text>
      <View style={styles.info}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {quest.title}
        </Text>
        {quest.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {quest.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <DifficultyBadge difficulty={quest.difficulty} />
          <Text style={styles.xp}>+{reward} XP</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      {onEdit ? (
        <Pressable
          style={styles.bodyPressable}
          accessibilityRole="button"
          accessibilityLabel={`Edit quest: ${quest.title}`}
          onPress={() => onEdit(quest.id)}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}

      {done ? (
        <View style={styles.doneBadge} accessibilityLabel="Quest completed">
          <Text style={styles.doneCheck}>✓</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Complete quest: ${quest.title}, rewards ${reward} XP`}
          onPress={() => onComplete(quest.id)}
          style={({ pressed }) => [styles.completeBtn, pressed && styles.completeBtnPressed]}
        >
          <Text style={styles.completeText}>Complete</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardDone: {
    opacity: 0.6,
  },
  bodyPressable: {
    flex: 1,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  icon: {
    fontSize: 26,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  xp: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  completeBtn: {
    backgroundColor: colors.completion,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  completeBtnPressed: {
    opacity: 0.85,
  },
  completeText: {
    ...typography.label,
    // Dark text on bright teal meets WCAG AA.
    color: colors.textPrimary,
  },
  doneBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheck: {
    color: colors.tealDeep,
    fontWeight: '700',
    fontSize: 18,
  },
});
