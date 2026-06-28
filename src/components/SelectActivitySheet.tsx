/**
 * Pick a real activity to add to a checklist — so checking the item completes a
 * real habit and counts everywhere. Lists the user's existing habits (search +
 * tap to pick), or create a brand-new habit inline (title + category) which is
 * persisted via GameContext.addQuest and then linked. Reuses the app's quests,
 * categories, and color system. Falls back gracefully when there are no habits.
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale, PrimaryButton } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { CATEGORY_COLOR, CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { Quest, QuestCategory } from '@/types';

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
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<QuestCategory>('health');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quests.filter((x) => !q || x.title.toLowerCase().includes(q));
  }, [quests, search]);

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
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
                      <Text style={[styles.catText, on && { color: '#fff' }]}>{CATEGORY_META[c].icon}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <PrimaryButton label={t('create')} variant="action" onPress={() => void create()} disabled={!newTitle.trim() || busy} />
              <Pressable onPress={() => setCreating(false)} accessibilityRole="button" style={styles.linkBtn}><Text style={styles.linkText}>{t('cancel')}</Text></Pressable>
            </View>
          ) : (
            <>
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
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {filtered.length === 0 && <Text style={styles.empty}>{t('noHabits')}</Text>}
                {filtered.map((q) => (
                  <PressableScale key={q.id} onPress={() => onPick(q)} accessibilityRole="button" style={styles.questRow}>
                    <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[q.category] }]} />
                    <Text style={styles.questTitle} numberOfLines={1}>{q.title}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, maxHeight: '80%', gap: spacing.sm },
  handleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  close: { ...typography.title, color: colors.textMuted },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  newPlus: { ...typography.title, color: colors.violetDeep, fontWeight: '900' },
  newText: { ...typography.label, color: colors.violetDeep, fontWeight: '800' },
  list: { maxHeight: 360 },
  empty: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.md },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  questTitle: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  createBox: { gap: spacing.sm },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  catChip: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  catText: { fontSize: 18 },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
});
