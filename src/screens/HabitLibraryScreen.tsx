import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DifficultyBadge, PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { findDuplicateActivity } from '@/lib/questForm';
import { libraryByCategory, type LibraryHabit } from '@/data/habitLibrary';
import { CATEGORY_META } from '@/lib/categories';
import { QUEST_XP } from '@/lib/leveling';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HabitLibrary'>;

/** Curated starter library (no AI). Add any habit to active quests in one tap. */
export function HabitLibraryScreen({ navigation }: Props) {
  const { t } = useTranslation('quests');
  const { quests, addLibraryHabit } = useGame();
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const sections = libraryByCategory();

  const handleAdd = async (habit: LibraryHabit) => {
    // Guard against piling up the same daily activity.
    if (findDuplicateActivity(quests, habit.title)) return;
    setAddedIds((prev) => [...prev, habit.id]);
    await addLibraryHabit(habit);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('library.title')}</Text>
        <Text style={styles.sub}>{t('library.sub')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {CATEGORY_META[section.category].icon} {t(`categories:${section.category}`)}
            </Text>
            {section.habits.map((habit) => {
              // "Added" if added this session OR already on the user's list.
              const added = addedIds.includes(habit.id) || findDuplicateActivity(quests, habit.title) !== undefined;
              return (
                <View key={habit.id} style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.title}>{habit.title}</Text>
                    <View style={styles.meta}>
                      <DifficultyBadge difficulty={habit.difficulty} />
                      <Text style={styles.xp}>+{QUEST_XP[habit.difficulty]} XP</Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      added ? t('library.addedA11y', { title: habit.title }) : t('library.addA11y', { title: habit.title })
                    }
                    accessibilityState={{ disabled: added }}
                    disabled={added}
                    onPress={() => handleAdd(habit)}
                    style={[styles.addBtn, added && styles.addBtnDone]}
                  >
                    <Text style={[styles.addText, added && styles.addTextDone]}>
                      {added ? t('library.added') : t('library.add')}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <PrimaryButton label={t('library.done')} variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.sm,
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
  addBtn: {
    backgroundColor: colors.action,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  addBtnDone: {
    backgroundColor: colors.tealSoft,
  },
  addText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  addTextDone: {
    color: colors.tealDeep,
  },
});
