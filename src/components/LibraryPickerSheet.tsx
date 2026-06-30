/**
 * "Ideas from the library" sheet — surfaces the curated Habit Library
 * (src/data/habitLibrary.ts) inside every add-an-activity flow so a user is
 * never staring at a blank field. Three ways to use it:
 *
 *  - default (direct add): goal chips at the top; tapping an idea adds it as a
 *    real quest, files it into the chosen goal (+ links the project for a project
 *    goal), and plans it for today — staying open for rapid multi-add.
 *  - `onPick`: tapping an idea creates the quest and hands it back (e.g. a
 *    checklist that wants to attach the new activity).
 *  - `onPrefill`: tapping an idea hands back its title/category/difficulty so a
 *    form (the full editor) can prefill and let the user keep customizing.
 *
 * Reuses GameContext.addLibraryHabit / GoalContext / PlanContext / ProjectsContext
 * and the same DifficultyBadge + dedupe (findDuplicateActivity) as the standalone
 * Habit Library screen — no new data layer.
 */
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { PressableScale } from '@/components/PressableScale';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { usePlan } from '@/state/PlanContext';
import { useProjects } from '@/state/ProjectsContext';
import { findDuplicateActivity } from '@/lib/questForm';
import { goalColor } from '@/lib/goal';
import { libraryByCategory, type LibraryHabit } from '@/data/habitLibrary';
import { CATEGORY_META } from '@/lib/categories';
import { QUEST_XP } from '@/lib/leveling';
import { dayKey } from '@/lib/dates';
import type { Quest, QuestCategory, QuestDifficulty } from '@/types';

export interface LibraryPrefill {
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}

export function LibraryPickerSheet({
  visible,
  onClose,
  defaultGoalId = null,
  onPick,
  onPrefill,
  embedded = false,
}: {
  visible: boolean;
  onClose: () => void;
  /** Pre-select a goal to file ideas into (direct-add mode). */
  defaultGoalId?: string | null;
  /** When set, picking an idea creates the quest and returns it (no goal filing). */
  onPick?: (quest: Quest) => void;
  /** When set, picking an idea returns its fields to prefill a form instead. */
  onPrefill?: (prefill: LibraryPrefill) => void;
  /**
   * Render as an in-tree absolute overlay instead of its own Modal. REQUIRED when
   * the host is itself a React Native Modal (e.g. AddActivitySheet,
   * SelectActivitySheet) — two stacked RN Modals deadlock iOS into a frozen screen.
   */
  embedded?: boolean;
}) {
  const { t } = useTranslation('quests');
  const { quests, addLibraryHabit } = useGame();
  const { goals, linkGoal } = useGoals();
  const { togglePlanned } = usePlan();
  const { linkHabit } = useProjects();

  const directAdd = !onPick && !onPrefill;
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId);
  const [query, setQuery] = useState('');
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setGoalId(defaultGoalId);
      setQuery('');
      setAddedIds([]);
    }
  }, [visible, defaultGoalId]);

  // Localized title (falls back to the stored English when untranslated).
  const habitTitle = (h: LibraryHabit) => t(`habits:${h.id}`, { defaultValue: h.title });

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    const all = libraryByCategory();
    if (!q) return all;
    return all
      .map((s) => ({ ...s, habits: s.habits.filter((h) => habitTitle(h).toLowerCase().includes(q)) }))
      .filter((s) => s.habits.length > 0);
    // habitTitle depends on t; q is the only changing input that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, t]);

  const selectedGoal = goals.find((g) => g.id === goalId) ?? null;

  const handlePick = async (habit: LibraryHabit) => {
    if (busy) return;
    const title = habitTitle(habit);

    if (onPrefill) {
      onPrefill({ title, category: habit.category, difficulty: habit.difficulty });
      onClose();
      return;
    }

    setBusy(true);
    try {
      // addLibraryHabit dedupes by canonical key and returns the (existing) quest.
      const quest = await addLibraryHabit({ ...habit, title });
      if (!quest) return;

      if (onPick) {
        onPick(quest);
        onClose();
        return;
      }

      // Direct add: file into the chosen goal and plan it for today.
      if (selectedGoal) {
        await linkGoal(quest.id, selectedGoal.id);
        if (selectedGoal.kind === 'project' && selectedGoal.projectId) await linkHabit(quest.id, selectedGoal.projectId);
      }
      await togglePlanned(dayKey(new Date()), quest.id);
      setAddedIds((prev) => (prev.includes(habit.id) ? prev : [...prev, habit.id]));
    } finally {
      setBusy(false);
    }
  };

  const isAdded = (h: LibraryHabit) =>
    addedIds.includes(h.id) || findDuplicateActivity(quests, habitTitle(h)) !== undefined;

  const body = (
    <>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('library.done')} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text style={styles.title}>{t('library.pickerTitle')}</Text>
              <Text style={styles.sub}>{directAdd ? t('library.pickerSubGoal') : t('library.pickerSub')}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('library.done')} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('library.searchIdeas')}
            placeholderTextColor={colors.textMuted}
            style={styles.search}
          />

          {/* File-into-goal chips (direct-add mode only). */}
          {directAdd && goals.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalRow}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                onPress={() => setGoalId(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: goalId === null }}
                style={[styles.goalChip, goalId === null && styles.goalChipOn]}
              >
                <Text style={[styles.goalText, goalId === null && styles.goalTextOn]}>{t('library.noGoal')}</Text>
              </Pressable>
              {goals.map((g) => {
                const on = goalId === g.id;
                const c = goalColor(g);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGoalId(on ? null : g.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.goalChip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                  >
                    <Text style={[styles.goalText, on && { color: c.accent }]} numberOfLines={1}>
                      {g.emoji} {g.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.category} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {CATEGORY_META[section.category].icon} {t(`categories:${section.category}`)}
                </Text>
                {section.habits.map((habit) => {
                  const added = directAdd && isAdded(habit);
                  return (
                    <PressableScale
                      key={habit.id}
                      onPress={() => void handlePick(habit)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: added }}
                      disabled={added}
                      accessibilityLabel={t('library.addA11y', { title: habitTitle(habit) })}
                      style={styles.row}
                    >
                      <View style={styles.info}>
                        <Text style={styles.rowTitle} numberOfLines={2}>{habitTitle(habit)}</Text>
                        <View style={styles.meta}>
                          <DifficultyBadge difficulty={habit.difficulty} />
                          <Text style={styles.xp}>+{QUEST_XP[habit.difficulty]} XP</Text>
                        </View>
                      </View>
                      <Text style={[styles.addGlyph, added && styles.addedGlyph]}>{added ? '✓' : '＋'}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            ))}
            {sections.length === 0 && <Text style={styles.empty}>{t('library.noIdeas')}</Text>}
          </ScrollView>
        </View>
    </>
  );

  // Embedded: an in-tree overlay (no second Modal) so it can safely sit over a
  // host that is already a Modal. Standalone: its own Modal (fine over a screen).
  if (embedded) {
    if (!visible) return null;
    return <View style={styles.embeddedOverlay}>{body}</View>;
  }
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  embeddedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', zIndex: 1000, elevation: 1000 },
  backdropTap: { flex: 1 },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, maxHeight: '88%', gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headText: { flex: 1, gap: 2 },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  sub: { ...typography.caption, color: colors.textSecondary },
  close: { ...typography.title, color: colors.textMuted },
  search: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  goalRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  goalChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, maxWidth: 200 },
  goalChipOn: { backgroundColor: colors.violetSoft, borderColor: colors.identity },
  goalText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  goalTextOn: { color: colors.violetDeep },
  list: { flexGrow: 0 },
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.textSecondary, letterSpacing: 1, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  info: { flex: 1, gap: spacing.xs },
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xp: { ...typography.caption, fontWeight: '700', color: colors.goldDeep },
  addGlyph: { ...typography.title, color: colors.violetDeep, fontWeight: '900' },
  addedGlyph: { color: colors.tealDeep },
  empty: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.md },
});
