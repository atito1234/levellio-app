import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DifficultyBadge, PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { libraryByCategory, type LibraryHabit } from '@/data/habitLibrary';
import { CATEGORY_META } from '@/lib/categories';
import { QUEST_XP } from '@/lib/leveling';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HabitLibrary'>;

/** Curated starter library (no AI). Add any habit to active quests in one tap. */
export function HabitLibraryScreen({ navigation }: Props) {
  const { addLibraryHabit } = useGame();
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const sections = libraryByCategory();

  const handleAdd = async (habit: LibraryHabit) => {
    setAddedIds((prev) => [...prev, habit.id]);
    await addLibraryHabit(habit);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.heading}>Habit Library</Text>
        <Text style={styles.sub}>Pick from curated habits — no AI needed.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {CATEGORY_META[section.category].icon} {CATEGORY_META[section.category].label}
            </Text>
            {section.habits.map((habit) => {
              const added = addedIds.includes(habit.id);
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
                      added ? `${habit.title} added` : `Add ${habit.title} to your quests`
                    }
                    accessibilityState={{ disabled: added }}
                    disabled={added}
                    onPress={() => handleAdd(habit)}
                    style={[styles.addBtn, added && styles.addBtnDone]}
                  >
                    <Text style={[styles.addText, added && styles.addTextDone]}>
                      {added ? '✓ Added' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <PrimaryButton label="Done" variant="ghost" onPress={() => navigation.goBack()} />
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
