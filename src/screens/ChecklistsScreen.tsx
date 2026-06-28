/**
 * Checklists: keep small lists, tick items off, and "check out" to close the day
 * with a streak. Items can be REAL activities (linked to a habit) — checking one
 * completes the habit and counts toward streak/XP/group/goal/project — or quick
 * text items. See src/lib/checklist.ts + ChecklistsContext.
 */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ConfettiBurst, PressableScale, PrimaryButton, ScreenContainer, SelectActivitySheet } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useChecklists } from '@/state/ChecklistsContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { checklistProgress, isItemDone, type Checklist } from '@/lib/checklist';
import { BUCKET_COLORS } from '@/lib/buckets';
import { dayKey } from '@/lib/dates';

const accentOf = (id: Checklist['colorId']) => BUCKET_COLORS.find((b) => b.id === id) ?? BUCKET_COLORS[0]!;

export function ChecklistsScreen() {
  const { t } = useTranslation('checklists');
  const { checklists, doneQuestIds, addChecklist, removeChecklist, addItem, removeItem, toggleItem, checkOut } = useChecklists();
  const { quests, uncompleteQuest } = useGame();
  const { projectsForHabit } = useProjects();
  const { goals, goalsForHabit } = useGoals();
  const { buckets, bucketIdFor } = useBuckets();
  const completeActivity = useCompleteActivity();
  const [newTitle, setNewTitle] = useState('');
  const [query, setQuery] = useState('');
  const [confetti, setConfetti] = useState(0);

  const q = query.trim().toLowerCase();
  const shown = q
    ? checklists.filter(
        (c) => c.title.toLowerCase().includes(q) || c.items.some((i) => i.label.toLowerCase().includes(q)),
      )
    : checklists;

  // Where a linked activity belongs — shown as a small subtitle (project > goal > group).
  const subtitleForQuest = (questId: string): string | null => {
    const proj = projectsForHabit(questId)[0];
    if (proj) return `${proj.emoji} ${proj.title}`;
    const goalId = goalsForHabit(questId)[0];
    if (goalId) {
      const g = goals.find((x) => x.id === goalId);
      if (g) return `${g.emoji} ${g.title}`;
    }
    const bId = bucketIdFor(questId);
    if (bId) {
      const b = buckets.find((x) => x.id === bId);
      if (b) return b.name;
    }
    return null;
  };

  // Linked items complete the real activity (needs the navigation-bound
  // useCompleteActivity, hence here in the screen, not the provider). Text items
  // toggle their local daily tick.
  const handleToggle = async (checklist: Checklist, itemId: string) => {
    const item = checklist.items.find((i) => i.id === itemId);
    if (item?.questId) {
      const quest = quests.find((q) => q.id === item.questId);
      if (!quest) return;
      const doneToday = quest.completed && quest.lastCompletedDate === dayKey(new Date());
      if (doneToday) {
        await uncompleteQuest(quest.id); // tap a done linked item → undo today's completion
      } else {
        await completeActivity(quest, { method: 'manual', durationSec: 0 });
      }
      return;
    }
    await toggleItem(checklist.id, itemId);
  };

  const create = async () => {
    if (!newTitle.trim()) return;
    await addChecklist({ title: newTitle, recurring: true });
    setNewTitle('');
  };

  const onCheckOut = async (c: Checklist) => {
    const res = await checkOut(c.id);
    if (res && !res.alreadyDoneToday) setConfetti((n) => n + 1);
  };

  const confirmDelete = (c: Checklist) =>
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => void removeChecklist(c.id) },
    ]);

  return (
    <ScreenContainer>
      {confetti > 0 && <ConfettiBurst key={confetti} />}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        <View style={styles.createRow}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={t('namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.createInput}
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => void create()}
          />
          <PrimaryButton label={t('create')} variant="action" onPress={() => void create()} disabled={!newTitle.trim()} />
        </View>

        {checklists.length > 2 && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchChecklists')}
            placeholderTextColor={colors.textMuted}
            style={styles.createInput}
          />
        )}

        {checklists.length === 0 && <Text style={styles.empty}>{t('empty')}</Text>}

        {shown.map((c) => (
          <ChecklistCard
            key={c.id}
            checklist={c}
            doneQuestIds={doneQuestIds}
            subtitleFor={subtitleForQuest}
            t={t}
            onToggle={(itemId) => void handleToggle(c, itemId)}
            onAddText={(label) => void addItem(c.id, label)}
            onAddQuest={(questId, label) => void addItem(c.id, label, questId)}
            onRemoveItem={(itemId) => void removeItem(c.id, itemId)}
            onCheckOut={() => void onCheckOut(c)}
            onDelete={() => confirmDelete(c)}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function ChecklistCard({
  checklist,
  doneQuestIds,
  subtitleFor,
  t,
  onToggle,
  onAddText,
  onAddQuest,
  onRemoveItem,
  onCheckOut,
  onDelete,
}: {
  checklist: Checklist;
  doneQuestIds: ReadonlySet<string>;
  subtitleFor: (questId: string) => string | null;
  t: ReturnType<typeof useTranslation>['t'];
  onToggle: (itemId: string) => void;
  onAddText: (label: string) => void;
  onAddQuest: (questId: string, label: string) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckOut: () => void;
  onDelete: () => void;
}) {
  const [itemDraft, setItemDraft] = useState('');
  const [picking, setPicking] = useState(false);
  const accent = accentOf(checklist.colorId);
  const prog = checklistProgress(checklist, doneQuestIds);
  const checkedToday = checklist.lastCheckoutDate === dayKey(new Date());

  const addDraft = () => {
    if (!itemDraft.trim()) return;
    onAddText(itemDraft);
    setItemDraft('');
  };

  return (
    <View style={[styles.card, { borderColor: accent.accent }]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardEmoji}>{checklist.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{checklist.title}</Text>
          <Text style={styles.cardMeta}>
            {t('progress', { done: prog.done, total: prog.total })}
            {checklist.checkoutStreak > 0 ? ` · 🔥 ${t('streak', { count: checklist.checkoutStreak })}` : ''}
          </Text>
        </View>
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('delete')} hitSlop={8}>
          <Text style={styles.delete}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${prog.pct}%`, backgroundColor: accent.accent }]} />
      </View>

      {checklist.items.map((item) => {
        const on = isItemDone(item, checklist.checkedItemIds, doneQuestIds);
        const linked = Boolean(item.questId);
        const subtitle = item.questId ? subtitleFor(item.questId) : null;
        return (
          <View key={item.id} style={styles.itemRow}>
            {/* Plain Pressable carries the row flex (fixes the prior blank-label
                collapse where flex landed on PressableScale's inner view). */}
            <Pressable onPress={() => onToggle(item.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.itemTap}>
              <View style={[styles.checkbox, on && { backgroundColor: accent.accent, borderColor: accent.accent }]}>
                {on && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.itemTextCol}>
                <Text style={[styles.itemLabel, on && styles.itemLabelDone]} numberOfLines={2}>{item.label}</Text>
                {subtitle ? <Text style={styles.itemSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
              {linked && <Text style={styles.linkTag}>{t('linked')}</Text>}
            </Pressable>
            <Pressable onPress={() => onRemoveItem(item.id)} accessibilityRole="button" accessibilityLabel={t('delete')} hitSlop={8}>
              <Text style={styles.itemRemove}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      <View style={styles.addRow}>
        <TextInput
          value={itemDraft}
          onChangeText={setItemDraft}
          placeholder={t('itemPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.addInput}
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={addDraft}
        />
        <Pressable onPress={addDraft} accessibilityRole="button" accessibilityLabel={t('addItem')} hitSlop={8}>
          <Text style={[styles.addPlus, { color: accent.accent }]}>＋</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setPicking(true)} accessibilityRole="button" style={styles.addActivityRow}>
        <Text style={[styles.addActivityText, { color: accent.accent }]}>🔗 {t('addActivity')}</Text>
      </Pressable>

      <PressableScale
        onPress={onCheckOut}
        disabled={checkedToday || prog.total === 0}
        accessibilityRole="button"
        style={[styles.checkoutBtn, { backgroundColor: checkedToday ? colors.surfaceAlt : accent.accent }]}
      >
        <Text style={[styles.checkoutText, { color: checkedToday ? colors.textMuted : '#FFFFFF' }]}>
          {checkedToday ? t('checkedOut') : prog.complete ? t('allDone') : t('checkOut')}
        </Text>
      </PressableScale>

      <SelectActivitySheet
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(quest) => {
          onAddQuest(quest.id, quest.title);
          setPicking(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.md },

  createRow: { gap: spacing.sm, marginBottom: spacing.sm },
  createInput: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardEmoji: { fontSize: 26 },
  cardTitle: { ...typography.title, color: colors.textPrimary },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  delete: { ...typography.title, color: colors.textMuted },

  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  itemTextCol: { flexShrink: 1 },
  itemLabel: { ...typography.body, color: colors.textPrimary },
  itemLabelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  itemSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  linkTag: { ...typography.caption, color: colors.violetDeep, fontWeight: '800' },
  itemRemove: { ...typography.body, color: colors.textMuted },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addInput: { ...typography.body, flex: 1, color: colors.textPrimary, backgroundColor: colors.surfaceAlt, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addPlus: { fontSize: 26, fontWeight: '900' },
  addActivityRow: { paddingVertical: spacing.xs },
  addActivityText: { ...typography.label, fontWeight: '800' },

  checkoutBtn: { borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  checkoutText: { ...typography.label, fontWeight: '800' },
});
