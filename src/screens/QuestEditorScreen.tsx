import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChipSelector,
  PrimaryButton,
  ScreenContainer,
  TextField,
  type ChipOption,
} from '@/components';
import { colors, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { validateQuestDraft, TITLE_MAX, DESCRIPTION_MAX, type QuestDraft } from '@/lib/questForm';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { QUEST_XP } from '@/lib/leveling';
import type { QuestCategory, QuestDifficulty } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestEditor'>;

const DIFFICULTY_OPTIONS: ChipOption<QuestDifficulty>[] = [
  { value: 'easy', label: `Easy · ${QUEST_XP.easy} XP` },
  { value: 'medium', label: `Medium · ${QUEST_XP.medium} XP` },
  { value: 'hard', label: `Hard · ${QUEST_XP.hard} XP` },
];

const CATEGORY_OPTIONS: ChipOption<QuestCategory>[] = CATEGORY_ORDER.map((c) => ({
  value: c,
  label: CATEGORY_META[c].label,
  icon: CATEGORY_META[c].icon,
}));

/** Manual quest creator/editor (no AI). Create, edit, and delete quests. */
export function QuestEditorScreen({ route, navigation }: Props) {
  const { quests, addQuest, updateQuest, deleteQuest } = useGame();
  const editingId = route.params?.questId;
  const existing = editingId ? quests.find((q) => q.id === editingId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(existing?.difficulty ?? 'easy');
  const [category, setCategory] = useState<QuestCategory>(existing?.category ?? 'health');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(existing);

  const handleSave = async () => {
    const draft: QuestDraft = { title, description, category, difficulty };
    const { valid, errors } = validateQuestDraft(draft);
    if (!valid) {
      setTitleError(errors.title);
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingId) {
        await updateQuest(editingId, draft);
      } else {
        await addQuest(draft);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    await deleteQuest(editingId);
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>{isEditing ? 'Edit Quest' : 'New Quest'}</Text>
          <Text style={styles.sub}>Turn a real-life goal or habit into a quest.</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="Title"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (titleError) setTitleError(undefined);
            }}
            placeholder="e.g. Read 10 pages"
            maxLength={TITLE_MAX}
            error={titleError}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Add a note to your future self"
            maxLength={DESCRIPTION_MAX}
            multiline
          />
          <ChipSelector
            label="Difficulty"
            options={DIFFICULTY_OPTIONS}
            selected={difficulty}
            onSelect={setDifficulty}
          />
          <ChipSelector
            label="Category"
            options={CATEGORY_OPTIONS}
            selected={category}
            onSelect={setCategory}
          />
        </ScrollView>

        <View style={styles.actions}>
          <PrimaryButton
            label={isEditing ? 'Save changes' : 'Create quest'}
            variant="action"
            onPress={handleSave}
            loading={saving}
          />
          {isEditing ? (
            <PrimaryButton label="Delete quest" variant="ghost" onPress={handleDelete} />
          ) : (
            <PrimaryButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  form: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
