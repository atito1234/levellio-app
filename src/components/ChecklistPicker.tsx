/**
 * Reusable checklist selector: search + list of the user's checklists with live
 * progress, tap to open. Shared by the Checklists screen surface and the planner
 * so selecting/finding a checklist feels identical everywhere. Optionally shows a
 * "create" action (e.g. the planner seeds one from a day's plan).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '@/components/PressableScale';
import { colors, radii, spacing, typography } from '@/theme';
import { useChecklists } from '@/state/ChecklistsContext';
import { checklistProgress } from '@/lib/checklist';
import { BUCKET_COLORS } from '@/lib/buckets';

export function ChecklistPicker({
  onOpen,
  onCreate,
  createLabel,
}: {
  onOpen: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
}) {
  const { t } = useTranslation('checklists');
  const { checklists, doneQuestIds } = useChecklists();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? checklists.filter((c) => c.title.toLowerCase().includes(q) || c.items.some((i) => i.label.toLowerCase().includes(q)))
    : checklists;

  return (
    <View style={styles.wrap}>
      {checklists.length > 2 && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchChecklists')}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
      )}
      {shown.map((c) => {
        const prog = checklistProgress(c, doneQuestIds);
        const accent = (BUCKET_COLORS.find((b) => b.id === c.colorId) ?? BUCKET_COLORS[0]!).accent;
        return (
          <PressableScale key={c.id} onPress={() => onOpen(c.id)} accessibilityRole="button" style={styles.row}>
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
            <Text style={[styles.progress, { color: accent }]}>{t('progress', { done: prog.done, total: prog.total })}</Text>
          </PressableScale>
        );
      })}
      {checklists.length === 0 && <Text style={styles.empty}>{t('empty')}</Text>}
      {onCreate && (
        <Pressable onPress={onCreate} accessibilityRole="button" style={styles.createRow}>
          <Text style={styles.createText}>＋ {createLabel ?? t('create')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  search: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  emoji: { fontSize: 20 },
  title: { ...typography.body, color: colors.textPrimary, flex: 1, fontWeight: '600' },
  progress: { ...typography.caption, fontWeight: '800' },
  empty: { ...typography.body, color: colors.textSecondary },
  createRow: { paddingVertical: spacing.sm, alignItems: 'center' },
  createText: { ...typography.label, color: colors.violetDeep, fontWeight: '800' },
});
