import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChipSelector,
  PrimaryButton,
  ScreenContainer,
  TextField,
  TimePicker,
  type ChipOption,
} from '@/components';
import { colors, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { validateQuestDraft, findDuplicateActivity, TITLE_MAX, DESCRIPTION_MAX, WHY_MAX, type QuestDraft } from '@/lib/questForm';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { habitScience } from '@/data/habitScience';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { QUEST_XP } from '@/lib/leveling';
import { isValidScheduleMinutes, minutesToParts, partsToMinutes, type TimeParts } from '@/lib/schedule';
import type { QuestCategory, QuestDifficulty } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

const DEFAULT_SCHEDULE_PARTS: TimeParts = { hour12: 9, minute: 0, meridiem: 'AM' };

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
  const { quests, character, addQuest, updateQuest, deleteQuest } = useGame();
  const guardAbandon = useAbandonGuard();
  const editingId = route.params?.questId;
  const existing = editingId ? quests.find((q) => q.id === editingId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(existing?.difficulty ?? 'easy');
  const [category, setCategory] = useState<QuestCategory>(existing?.category ?? 'health');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(isValidScheduleMinutes(existing?.scheduledTime));
  const [parts, setParts] = useState<TimeParts>(
    isValidScheduleMinutes(existing?.scheduledTime)
      ? minutesToParts(existing!.scheduledTime!)
      : DEFAULT_SCHEDULE_PARTS,
  );
  // Optional measurement: a quick 1–5 "how did it go?" at completion + the
  // user's own reason it matters (the personalization source for any habit).
  const [rateOn, setRateOn] = useState(existing?.metric === 'rating');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [whyError, setWhyError] = useState<string | undefined>();

  const isEditing = Boolean(existing);
  const scheduledTime = scheduleOn ? partsToMinutes(parts) : undefined;
  // Smart suggestion (never imposed): a science-grounded reason for known habits.
  const whyPlaceholder = title.trim()
    ? habitScience({ title, category }).why.replace(/^a /, '').concat(' …')
    : 'e.g. so I feel calmer and more focused';

  const persist = async (draft: QuestDraft) => {
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

  const handleSave = async () => {
    const draft: QuestDraft = {
      title,
      description,
      category,
      difficulty,
      scheduledTime,
      ...(rateOn ? { metric: 'rating' as const } : {}),
      ...(why.trim() ? { why } : {}),
    };
    const { valid, errors } = validateQuestDraft(draft);
    if (!valid) {
      setTitleError(errors.title);
      setWhyError(errors.why);
      return;
    }
    // Don't quietly pile up the same activity day after day — warn on duplicates.
    const dup = findDuplicateActivity(quests, draft.title, editingId);
    if (dup) {
      Alert.alert(
        'Already on your list',
        `You already have “${dup.title}”. It repeats every day, so you don't need to add it again.`,
        [
          { text: 'Keep one', style: 'cancel' },
          { text: 'Add anyway', style: 'destructive', onPress: () => void persist(draft) },
        ],
      );
      return;
    }
    await persist(draft);
  };

  const doDelete = async () => {
    if (!editingId) return;
    await deleteQuest(editingId);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!editingId) return;
    // Deleting a habit with a real streak earns a "think twice" pause.
    if (guardAbandon({ kind: 'quest-delete', ctx: { streakDays: character?.streakDays ?? 0 }, onProceed: () => void doDelete() })) return;
    void doDelete();
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

          {/* Optional pinned time — works for timed and untimed activities alike. */}
          <View style={styles.scheduleBlock}>
            <View style={styles.scheduleHead}>
              <View style={styles.scheduleHeadText}>
                <Text style={styles.scheduleLabel}>Set a time</Text>
                <Text style={styles.scheduleHint}>Pin this activity to a specific time of day.</Text>
              </View>
              <Switch
                value={scheduleOn}
                onValueChange={setScheduleOn}
                trackColor={{ true: colors.identity, false: colors.border }}
                accessibilityLabel="Set a specific time for this activity"
              />
            </View>

            {scheduleOn && (
              <TimePicker minutes={partsToMinutes(parts)} onChange={(m) => setParts(minutesToParts(m))} />
            )}
          </View>

          {/* Optional: rate how it goes (1–5) + your own reason it matters. */}
          <View style={styles.scheduleBlock}>
            <View style={styles.scheduleHead}>
              <View style={styles.scheduleHeadText}>
                <Text style={styles.scheduleLabel}>Rate how it goes (1–5)</Text>
                <Text style={styles.scheduleHint}>
                  A quick “how did it go?” after each focus session — works for any habit, and powers
                  your insights.
                </Text>
              </View>
              <Switch
                value={rateOn}
                onValueChange={setRateOn}
                trackColor={{ true: colors.identity, false: colors.border }}
                accessibilityLabel="Ask for a 1 to 5 rating after completing this habit"
              />
            </View>
            <TextField
              label="Why this matters to you (optional)"
              value={why}
              onChangeText={(t) => {
                setWhy(t);
                if (whyError) setWhyError(undefined);
              }}
              placeholder={whyPlaceholder}
              maxLength={WHY_MAX}
              error={whyError}
              multiline
            />
          </View>
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
  scheduleBlock: { gap: spacing.md },
  scheduleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  scheduleHeadText: { flex: 1, gap: 2 },
  scheduleLabel: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  scheduleHint: { ...typography.caption, color: colors.textSecondary },
});
