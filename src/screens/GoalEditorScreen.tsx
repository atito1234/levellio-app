import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGoals } from '@/state/GoalContext';
import { useGame } from '@/state/GameContext';
import { GOAL_TEMPLATES, type GoalTemplate } from '@/data/goalTemplates';
import { HABIT_LIBRARY } from '@/data/habitLibrary';
import { GOAL_COLOR_IDS } from '@/lib/goal';
import { getBucketColor, type BucketColorId } from '@/lib/buckets';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { QuestCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalEditor'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const EMOJI_CHOICES = ['🎯', '💪', '🥗', '❤️', '🧘', '💰', '📚', '🌱', '🏆', '✨', '😴', '🧠'];

export function GoalEditorScreen({ route, navigation }: Props) {
  const { t } = useTranslation('goals');
  const { goals, addGoal, updateGoal, removeGoal } = useGoals();
  const { addLibraryHabit } = useGame();

  const editingId = route.params?.goalId;
  const existing = editingId ? goals.find((g) => g.id === editingId) : undefined;
  const isEditing = Boolean(existing);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🎯');
  const [colorId, setColorId] = useState<BucketColorId>(existing?.colorId ?? 'violet');
  const [categories, setCategories] = useState<QuestCategory[]>(existing?.categories ?? []);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && categories.length > 0 && !saving;

  const toggleCategory = (c: QuestCategory) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const templateTitle = (tpl: GoalTemplate) => t(`goalTemplates:${tpl.key}`, { defaultValue: tpl.title });

  const createFromTemplate = async (tpl: GoalTemplate) => {
    if (saving) return;
    setSaving(true);
    await addGoal({ title: templateTitle(tpl), emoji: tpl.emoji, colorId: tpl.colorId, categories: tpl.categories });
    // Seed a few starter habits (deduped via the canonical create path).
    for (const id of tpl.suggestedHabitIds) {
      const habit = HABIT_LIBRARY.find((h) => h.id === id);
      if (habit) await addLibraryHabit(habit);
    }
    navigation.goBack();
  };

  const saveCustom = async () => {
    if (!canSave) return;
    setSaving(true);
    if (isEditing && editingId) {
      await updateGoal(editingId, { title: title.trim(), emoji, colorId, categories });
    } else {
      await addGoal({ title, emoji, colorId, categories });
    }
    navigation.goBack();
  };

  const confirmDelete = () => {
    if (!editingId) return;
    Alert.alert(t('deleteTitle'), t('deleteBody'), [
      { text: t('keep'), style: 'cancel' },
      {
        text: t('deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          await removeGoal(editingId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {isEditing ? t('editTitle') : t('newTitle')}
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!isEditing && (
          <>
            <Text style={styles.lead}>{t('lead')}</Text>

            <Text style={styles.sectionLabel}>{t('pickGoal')}</Text>
            <View style={styles.templates}>
              {GOAL_TEMPLATES.map((tpl) => (
                <Pressable
                  key={tpl.key}
                  onPress={() => void createFromTemplate(tpl)}
                  accessibilityRole="button"
                  accessibilityLabel={t('createA11y', { title: templateTitle(tpl) })}
                  style={styles.templateCard}
                >
                  <Text style={styles.templateEmoji}>{tpl.emoji}</Text>
                  <Text style={styles.templateTitle}>{templateTitle(tpl)}</Text>
                  <Text style={styles.templateAreas} numberOfLines={1}>
                    {tpl.categories.map((c) => t(`categories:${c}`)).join(' · ')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>{t('orOwn')}</Text>
          </>
        )}
        <View style={styles.form}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={MUTED}
            style={styles.input}
            maxLength={60}
            accessibilityLabel={t('titleA11y')}
          />

          <Text style={styles.fieldLabel}>{t('icon')}</Text>
          <View style={styles.emojiRow}>
            {EMOJI_CHOICES.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                accessibilityRole="button"
                accessibilityLabel={t('iconA11y', { emoji: e })}
                accessibilityState={{ selected: emoji === e }}
                style={[styles.emojiCell, emoji === e && styles.emojiCellOn]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t('lifeAreas')}</Text>
          <View style={styles.chips}>
            {CATEGORY_ORDER.map((c) => {
              const on = categories.includes(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => toggleCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t(`categories:${c}`)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {CATEGORY_META[c].icon} {t(`categories:${c}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>{t('color')}</Text>
          <View style={styles.colorRow}>
            {GOAL_COLOR_IDS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColorId(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: colorId === c }}
                accessibilityLabel={t('colorA11y', { color: c })}
                style={[styles.swatch, { backgroundColor: getBucketColor(c).accent }, colorId === c && styles.swatchOn]}
              />
            ))}
          </View>

          <Pressable
            onPress={() => void saveCustom()}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? t('saveChanges') : t('create')}
            style={[styles.save, !canSave && styles.saveOff]}
          >
            <Text style={styles.saveText}>{isEditing ? t('saveChanges') : t('create')}</Text>
          </Pressable>

          {isEditing && (
            <Pressable onPress={confirmDelete} accessibilityRole="button" accessibilityLabel={t('delete')} style={styles.delete}>
              <Text style={styles.deleteText}>{t('delete')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  title: { ...typography.heading, color: INK },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  lead: { ...typography.body, color: MUTED },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },

  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  templateCard: { width: '48%', backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: 4 },
  templateEmoji: { fontSize: 26 },
  templateTitle: { ...typography.body, color: INK, fontWeight: '700' },
  templateAreas: { ...typography.caption, color: MUTED },

  form: { gap: spacing.sm },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  fieldLabel: { ...typography.label, color: MUTED, marginTop: spacing.xs },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: TRACK },
  emojiCellOn: { borderColor: VIOLET, backgroundColor: VIOLET_SOFT },
  emojiText: { fontSize: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.label, color: MUTED, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '700' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 36, height: 36, borderRadius: 999, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: INK },

  save: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  saveOff: { opacity: 0.4 },
  saveText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  delete: { alignItems: 'center', paddingVertical: spacing.md },
  deleteText: { ...typography.label, color: '#C0202C', fontWeight: '700' },
});
