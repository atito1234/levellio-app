/**
 * Checklists: keep small lists, tick items off, and "check out" to close the day
 * with a streak. Curated retention loop — see src/lib/checklist.ts for the model.
 */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ConfettiBurst, PressableScale, PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useChecklists } from '@/state/ChecklistsContext';
import { checklistProgress, type Checklist } from '@/lib/checklist';
import { BUCKET_COLORS } from '@/lib/buckets';
import { dayKey } from '@/lib/dates';

const accentOf = (id: Checklist['colorId']) => BUCKET_COLORS.find((b) => b.id === id) ?? BUCKET_COLORS[0]!;

export function ChecklistsScreen() {
  const { t } = useTranslation('checklists');
  const { checklists, addChecklist, removeChecklist, addItem, removeItem, toggleItem, checkOut } = useChecklists();
  const [newTitle, setNewTitle] = useState('');
  const [confetti, setConfetti] = useState(0);

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

        {checklists.length === 0 && <Text style={styles.empty}>{t('empty')}</Text>}

        {checklists.map((c) => (
          <ChecklistCard
            key={c.id}
            checklist={c}
            t={t}
            onToggle={(itemId) => void toggleItem(c.id, itemId)}
            onAddItem={(label) => void addItem(c.id, label)}
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
  t,
  onToggle,
  onAddItem,
  onRemoveItem,
  onCheckOut,
  onDelete,
}: {
  checklist: Checklist;
  t: ReturnType<typeof useTranslation>['t'];
  onToggle: (itemId: string) => void;
  onAddItem: (label: string) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckOut: () => void;
  onDelete: () => void;
}) {
  const [itemDraft, setItemDraft] = useState('');
  const accent = accentOf(checklist.colorId);
  const prog = checklistProgress(checklist);
  const checkedToday = checklist.lastCheckoutDate === dayKey(new Date());

  const addDraft = () => {
    if (!itemDraft.trim()) return;
    onAddItem(itemDraft);
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

      {/* progress bar */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${prog.pct}%`, backgroundColor: accent.accent }]} />
      </View>

      {checklist.items.map((item) => {
        const on = checklist.checkedItemIds.includes(item.id);
        return (
          <View key={item.id} style={styles.itemRow}>
            <PressableScale onPress={() => onToggle(item.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.itemTap}>
              <View style={[styles.checkbox, on && { backgroundColor: accent.accent, borderColor: accent.accent }]}>
                {on && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.itemLabel, on && styles.itemLabelDone]}>{item.label}</Text>
            </PressableScale>
            <Pressable onPress={() => onRemoveItem(item.id)} accessibilityRole="button" hitSlop={8}>
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
  itemTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  itemLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  itemLabelDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  itemRemove: { ...typography.body, color: colors.textMuted },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addInput: { ...typography.body, flex: 1, color: colors.textPrimary, backgroundColor: colors.surfaceAlt, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addPlus: { fontSize: 26, fontWeight: '900' },

  checkoutBtn: { borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  checkoutText: { ...typography.label, fontWeight: '800' },
});
