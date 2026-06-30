/**
 * The checklist "activity generator": pick a real activity to add to a checklist,
 * sourced from ANYWHERE in the app that carries activities — all your habits, a
 * group (bucket), a goal, a community project's suggested habits, or today's plan
 * — or create a brand-new habit inline. Whatever you pick is a real quest, so
 * checking it later completes the habit and counts toward streak/XP/group/goal/
 * project. Reuses GameContext / BucketsContext / GoalContext / ProjectsContext /
 * PlanContext — no new data layer.
 */
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
// Import directly (not via the '@/components' barrel) — the barrel re-exports this
// file, so importing from it creates a require cycle that can leave these
// components undefined at render and crash the screen.
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LibraryPickerSheet } from '@/components/LibraryPickerSheet';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useGoals } from '@/state/GoalContext';
import { useProjects } from '@/state/ProjectsContext';
import { usePlan } from '@/state/PlanContext';
import { goalHabits } from '@/lib/goal';
import { dayKey, shiftDayKey } from '@/lib/dates';
import { recurringIdsForDay, weekdayOfKey } from '@/lib/recurrence';
import { CATEGORY_COLOR, CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { Quest, QuestCategory } from '@/types';

type Source =
  | { type: 'all' }
  | { type: 'today' }
  | { type: 'week' }
  | { type: 'group'; id: string }
  | { type: 'goal'; id: string }
  | { type: 'project'; id: string };

export function SelectActivitySheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  /** Returns the chosen (existing or freshly created) quest to link. */
  onPick: (quest: Quest) => void;
}) {
  const { t } = useTranslation('checklists');
  const { quests, addQuest } = useGame();
  const { buckets, bucketIdFor } = useBuckets();
  const { goals, membershipFor } = useGoals();
  const { myProjects, projectsForHabit, linkHabit } = useProjects();
  const { getPlan } = usePlan();

  const [source, setSource] = useState<Source>({ type: 'all' });
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<QuestCategory>('health');
  const [busy, setBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Quest ids planned across the next 7 days (explicit plan, else recurring).
  const weekIds = useMemo(() => {
    const today = dayKey(new Date());
    const ids = new Set<string>();
    for (let offset = 0; offset < 7; offset += 1) {
      const key = shiftDayKey(today, offset);
      const planned = getPlan(key);
      if (planned) planned.forEach((id) => ids.add(id));
      else recurringIdsForDay(quests, weekdayOfKey(key)).forEach((id) => ids.add(id));
    }
    return ids;
  }, [quests, getPlan]);

  // Existing quests that match the chosen source.
  const sourceQuests = useMemo<Quest[]>(() => {
    switch (source.type) {
      case 'all':
        return quests;
      case 'today': {
        const ids = new Set(getPlan(dayKey(new Date())) ?? []);
        return quests.filter((q) => ids.has(q.id));
      }
      case 'week':
        return quests.filter((q) => weekIds.has(q.id));
      case 'group':
        return quests.filter((q) => bucketIdFor(q.id) === source.id);
      case 'goal': {
        const g = goals.find((x) => x.id === source.id);
        return g ? goalHabits(quests, g, membershipFor(g.id)) : [];
      }
      case 'project':
        return quests.filter((q) => projectsForHabit(q.id).some((p) => p.id === source.id));
      default:
        return quests;
    }
  }, [source, quests, getPlan, weekIds, bucketIdFor, goals, membershipFor, projectsForHabit]);

  // For a project source: its suggested habits that aren't already a quest — tap
  // to create the quest, link it to the project, and add it to the checklist.
  const suggested = useMemo(() => {
    if (source.type !== 'project') return [];
    const proj = myProjects.find((p) => p.id === source.id);
    if (!proj) return [];
    const have = new Set(quests.map((q) => q.title.trim().toLowerCase()));
    return proj.suggestedHabits.filter((h) => !have.has(h.title.trim().toLowerCase()));
  }, [source, myProjects, quests]);

  const q = search.trim().toLowerCase();
  const filtered = q ? sourceQuests.filter((x) => x.title.toLowerCase().includes(q)) : sourceQuests;

  const create = async () => {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    const quest = await addQuest({ title: newTitle.trim(), category: newCat, difficulty: 'easy' });
    setBusy(false);
    if (quest) {
      setNewTitle('');
      setCreating(false);
      onPick(quest);
    }
  };

  const pickSuggested = async (title: string, category: QuestCategory) => {
    if (busy) return;
    setBusy(true);
    const quest = await addQuest({ title, category, difficulty: 'easy' });
    if (quest && source.type === 'project') await linkHabit(quest.id, source.id);
    setBusy(false);
    if (quest) onPick(quest);
  };

  const sources: { key: string; label: string; src: Source }[] = [
    { key: 'all', label: t('srcAll'), src: { type: 'all' } },
    { key: 'today', label: t('srcToday'), src: { type: 'today' } },
    { key: 'week', label: t('srcWeek'), src: { type: 'week' } },
    ...buckets.map((b) => ({ key: `g-${b.id}`, label: b.name, src: { type: 'group' as const, id: b.id } })),
    ...goals.map((g) => ({ key: `goal-${g.id}`, label: `${g.emoji} ${g.title}`, src: { type: 'goal' as const, id: g.id } })),
    ...myProjects.map((p) => ({ key: `p-${p.id}`, label: `${p.emoji} ${p.title}`, src: { type: 'project' as const, id: p.id } })),
  ];

  const isActive = (s: Source) => {
    if (s.type !== source.type) return false;
    const sId = 'id' in s ? s.id : undefined;
    const curId = 'id' in source ? source.id : undefined;
    return sId === curId;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <Text style={styles.title}>{t('addActivity')}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('cancel')} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {creating ? (
            <View style={styles.createBox}>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={t('newHabitPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={80}
                autoFocus
              />
              <View style={styles.catWrap}>
                {CATEGORY_ORDER.map((c) => {
                  const on = newCat === c;
                  return (
                    <Pressable key={c} onPress={() => setNewCat(c)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.catChip, on && { backgroundColor: CATEGORY_COLOR[c], borderColor: CATEGORY_COLOR[c] }]}>
                      <Text style={styles.catText}>{CATEGORY_META[c].icon}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <PrimaryButton label={t('create')} variant="action" onPress={() => void create()} disabled={!newTitle.trim() || busy} />
              <Pressable onPress={() => setCreating(false)} accessibilityRole="button" style={styles.linkBtn}><Text style={styles.linkText}>{t('cancel')}</Text></Pressable>
            </View>
          ) : (
            <>
              {/* Source filter — browse activities from anywhere in the app. */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.srcRow} keyboardShouldPersistTaps="handled">
                {sources.map((s) => {
                  const on = isActive(s.src);
                  return (
                    <Pressable key={s.key} onPress={() => setSource(s.src)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.srcChip, on && styles.srcChipOn]}>
                      <Text style={[styles.srcText, on && styles.srcTextOn]} numberOfLines={1}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('searchHabits')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Pressable onPress={() => setCreating(true)} accessibilityRole="button" style={styles.newRow}>
                <Text style={styles.newPlus}>＋</Text>
                <Text style={styles.newText}>{t('newHabit')}</Text>
              </Pressable>
              <Pressable onPress={() => setLibraryOpen(true)} accessibilityRole="button" style={styles.newRow}>
                <Text style={styles.newText}>{t('quests:library.ideas')}</Text>
              </Pressable>

              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {filtered.map((quest) => (
                  <PressableScale key={quest.id} onPress={() => onPick(quest)} accessibilityRole="button" style={styles.questRow}>
                    <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[quest.category] }]} />
                    <Text style={styles.questTitle} numberOfLines={1}>{quest.title}</Text>
                  </PressableScale>
                ))}

                {suggested.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>{t('fromProject')}</Text>
                    {suggested.map((h, i) => (
                      <PressableScale key={`sug-${i}-${h.title}`} onPress={() => void pickSuggested(h.title, h.category)} accessibilityRole="button" style={styles.questRow}>
                        <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[h.category] }]} />
                        <Text style={styles.questTitle} numberOfLines={1}>{h.title}</Text>
                        <Text style={styles.addGlyph}>＋</Text>
                      </PressableScale>
                    ))}
                  </>
                )}

                {filtered.length === 0 && suggested.length === 0 && <Text style={styles.empty}>{t('noHabits')}</Text>}
              </ScrollView>
            </>
          )}
        </View>
        <LibraryPickerSheet
          embedded
          visible={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onPick={(quest) => {
            setLibraryOpen(false);
            onPick(quest);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, maxHeight: '85%', gap: spacing.sm },
  handleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  close: { ...typography.title, color: colors.textMuted },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  srcRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  srcChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, maxWidth: 200 },
  srcChipOn: { backgroundColor: colors.violetSoft, borderColor: colors.identity },
  srcText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  srcTextOn: { color: colors.violetDeep },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  newPlus: { ...typography.title, color: colors.violetDeep, fontWeight: '900' },
  newText: { ...typography.label, color: colors.violetDeep, fontWeight: '800' },
  list: { maxHeight: 380 },
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.md },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  questTitle: { ...typography.body, color: colors.textPrimary, flex: 1 },
  addGlyph: { ...typography.title, color: colors.violetDeep, fontWeight: '900' },
  createBox: { gap: spacing.sm },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  catChip: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  catText: { fontSize: 18 },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
});
