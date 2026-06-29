import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ChipSelector,
  PrimaryButton,
  ScreenContainer,
  TextField,
  TimePicker,
  type ChipOption,
} from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { BUCKETS_ENABLED } from '@/config/features';
import { usePlan } from '@/state/PlanContext';
import { dayKey } from '@/lib/dates';
import { getBucketColor } from '@/lib/buckets';
import { validateQuestDraft, findDuplicateActivity, TITLE_MAX, DESCRIPTION_MAX, WHY_MAX, type QuestDraft } from '@/lib/questForm';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { habitScience } from '@/data/habitScience';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { QUEST_XP } from '@/lib/leveling';
import { isValidScheduleMinutes, minutesToParts, partsToMinutes, type TimeParts } from '@/lib/schedule';
import { weekdaysLabel } from '@/lib/recurrence';
import { recurrenceLabelOpts } from '@/lib/recurrenceLabels';
import type { QuestCategory, QuestDifficulty } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

const DEFAULT_SCHEDULE_PARTS: TimeParts = { hour12: 9, minute: 0, meridiem: 'AM' };

type Props = NativeStackScreenProps<RootStackParamList, 'QuestEditor'>;

/** Manual quest creator/editor (no AI). Create, edit, and delete quests. */
export function QuestEditorScreen({ route, navigation }: Props) {
  const { t } = useTranslation('quests');
  const CATEGORY_OPTIONS: ChipOption<QuestCategory>[] = CATEGORY_ORDER.map((c) => ({
    value: c,
    label: t(`categories:${c}`),
    icon: CATEGORY_META[c].icon,
  }));
  const DIFFICULTY_OPTIONS: ChipOption<QuestDifficulty>[] = [
    { value: 'easy', label: t('difficultyEasy', { xp: QUEST_XP.easy }) },
    { value: 'medium', label: t('difficultyMedium', { xp: QUEST_XP.medium }) },
    { value: 'hard', label: t('difficultyHard', { xp: QUEST_XP.hard }) },
  ];
  const weekShort = t('common:weekdaysShort', { returnObjects: true }) as string[];
  const weekFull = t('common:weekdaysFull', { returnObjects: true }) as string[];
  const { quests, character, addQuest, updateQuest, deleteQuest } = useGame();
  const { signedIn, myProjects, linkedProjectIds, linkHabit, unlinkHabit } = useProjects();
  const { goals, linkGoal } = useGoals();
  const { assignActivity } = useBuckets();
  const { getPlan, togglePlanned } = usePlan();
  const guardAbandon = useAbandonGuard();
  const editingId = route.params?.questId;
  // Context carried from the quick "Add an activity" sheet (goal/group/projects).
  const ctxGoal = route.params?.goalId ? goals.find((g) => g.id === route.params!.goalId) : undefined;
  const ctxBucketId = route.params?.bucketId;
  const todayK = dayKey(new Date());
  const existing = editingId ? quests.find((q) => q.id === editingId) : undefined;
  // When opened from the quick sheet's "Advanced options", seed from its prefill.
  const prefill = existing ? undefined : route.params?.prefill;
  const initialTime = existing?.scheduledTime ?? prefill?.scheduledTime;

  const [title, setTitle] = useState(existing?.title ?? prefill?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? prefill?.description ?? '');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(existing?.difficulty ?? prefill?.difficulty ?? 'easy');
  const [category, setCategory] = useState<QuestCategory>(existing?.category ?? prefill?.category ?? 'health');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(isValidScheduleMinutes(initialTime));
  const [parts, setParts] = useState<TimeParts>(
    isValidScheduleMinutes(initialTime) ? minutesToParts(initialTime!) : DEFAULT_SCHEDULE_PARTS,
  );
  const [repeatDays, setRepeatDays] = useState<number[]>(existing?.scheduledDays ?? prefill?.scheduledDays ?? []);
  // Optional measurement: a quick 1–5 "how did it go?" at completion + the
  // user's own reason it matters (the personalization source for any habit).
  const [rateOn, setRateOn] = useState(existing?.metric === 'rating');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [whyError, setWhyError] = useState<string | undefined>();
  // Which community projects this habit powers (cross-pollination).
  const [projectIds, setProjectIds] = useState<string[]>(() => (editingId ? linkedProjectIds(editingId) : route.params?.projectIds ?? []));
  // A project context → make it a daily habit and file it in by default.
  const projectScoped = projectIds.length > 0 || ctxGoal?.kind === 'project';

  const isEditing = Boolean(existing);
  const scheduledTime = scheduleOn ? partsToMinutes(parts) : undefined;
  // Smart suggestion (never imposed): a science-grounded reason for known habits.
  const whyPlaceholder = title.trim()
    ? habitScience({ title, category }).why.replace(/^a /, '').concat(' …')
    : t('whyPlaceholder');

  const persist = async (draft: QuestDraft) => {
    setSaving(true);
    try {
      let id = editingId;
      if (isEditing && editingId) {
        await updateQuest(editingId, draft);
      } else {
        const created = await addQuest(draft);
        id = created?.id;
      }
      // Reconcile project links to the current selection.
      if (id) {
        const current = linkedProjectIds(id);
        for (const pid of projectIds) if (!current.includes(pid)) await linkHabit(id, pid);
        for (const pid of current) if (!projectIds.includes(pid)) await unlinkHabit(id, pid);
      }
      // Apply the goal / group / project context carried from the quick sheet.
      if (id) {
        if (ctxGoal) {
          await linkGoal(id, ctxGoal.id);
          if (ctxGoal.kind === 'project' && ctxGoal.projectId) await linkHabit(id, ctxGoal.projectId);
        }
        if (BUCKETS_ENABLED && ctxBucketId) await assignActivity(id, ctxBucketId);
        if (projectScoped && !(getPlan(todayK) ?? []).includes(id)) await togglePlanned(todayK, id);
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
      ...(repeatDays.length ? { scheduledDays: repeatDays } : projectScoped ? { scheduledDays: [0, 1, 2, 3, 4, 5, 6] } : {}),
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
        t('dupTitle'),
        t('dupBody', { title: dup.title }),
        [
          { text: t('dupKeep'), style: 'cancel' },
          { text: t('dupAdd'), style: 'destructive', onPress: () => void persist(draft) },
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
          <Text style={styles.heading}>{isEditing ? t('editTitle') : t('newTitle')}</Text>
          <Text style={styles.sub}>{t('sub')}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label={t('title')}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (titleError) setTitleError(undefined);
            }}
            placeholder={t('titlePlaceholder')}
            maxLength={TITLE_MAX}
            error={titleError}
          />
          <TextField
            label={t('description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('descriptionPlaceholder')}
            maxLength={DESCRIPTION_MAX}
            multiline
          />
          <ChipSelector
            label={t('difficulty')}
            options={DIFFICULTY_OPTIONS}
            selected={difficulty}
            onSelect={setDifficulty}
          />
          <ChipSelector
            label={t('category')}
            options={CATEGORY_OPTIONS}
            selected={category}
            onSelect={setCategory}
          />

          {/* Optional pinned time — works for timed and untimed activities alike. */}
          <View style={styles.scheduleBlock}>
            <View style={styles.scheduleHead}>
              <View style={styles.scheduleHeadText}>
                <Text style={styles.scheduleLabel}>{t('setTime')}</Text>
                <Text style={styles.scheduleHint}>{t('setTimeHint')}</Text>
              </View>
              <Switch
                value={scheduleOn}
                onValueChange={setScheduleOn}
                trackColor={{ true: colors.identity, false: colors.border }}
                accessibilityLabel={t('setTimeA11y')}
              />
            </View>

            {scheduleOn && (
              <TimePicker minutes={partsToMinutes(parts)} onChange={(m) => setParts(minutesToParts(m))} />
            )}
          </View>

          {/* Optional weekly recurrence — repeat on chosen weekdays. */}
          <View style={styles.scheduleBlock}>
            <View style={styles.scheduleHeadText}>
              <Text style={styles.scheduleLabel}>{t('repeat')}</Text>
              <Text style={styles.scheduleHint}>
                {repeatDays.length ? weekdaysLabel(repeatDays, recurrenceLabelOpts(t)) : t('repeatHint')}
              </Text>
            </View>
            <View style={styles.weekRow}>
              {weekShort.map((d, i) => {
                const on = repeatDays.includes(i);
                return (
                  <Pressable
                    key={i}
                    onPress={() => setRepeatDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t('repeatOnA11y', { day: weekFull[i] })}
                    style={[styles.weekday, on && styles.weekdayOn]}
                  >
                    <Text style={[styles.weekdayText, on && styles.weekdayTextOn]}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Optional: rate how it goes (1–5) + your own reason it matters. */}
          <View style={styles.scheduleBlock}>
            <View style={styles.scheduleHead}>
              <View style={styles.scheduleHeadText}>
                <Text style={styles.scheduleLabel}>{t('rate')}</Text>
                <Text style={styles.scheduleHint}>{t('rateHint')}</Text>
              </View>
              <Switch
                value={rateOn}
                onValueChange={setRateOn}
                trackColor={{ true: colors.identity, false: colors.border }}
                accessibilityLabel={t('rateA11y')}
              />
            </View>
            <TextField
              label={t('why')}
              value={why}
              onChangeText={(text) => {
                setWhy(text);
                if (whyError) setWhyError(undefined);
              }}
              placeholder={whyPlaceholder}
              maxLength={WHY_MAX}
              error={whyError}
              multiline
            />
          </View>

          {/* Cross-pollination: also power community projects with this habit. */}
          {signedIn && myProjects.length > 0 && (
            <View style={styles.scheduleBlock}>
              <View style={styles.scheduleHeadText}>
                <Text style={styles.scheduleLabel}>{t('contributesProject')}</Text>
                <Text style={styles.scheduleHint}>{t('contributesHint')}</Text>
              </View>
              <View style={styles.projChips}>
                {myProjects.map((p) => {
                  const on = projectIds.includes(p.id);
                  const c = getBucketColor(p.colorId);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setProjectIds((cur) => (on ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.projChip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                    >
                      <Text style={[styles.projChipText, on && { color: c.accent }]} numberOfLines={1}>
                        {on ? '🤝 ' : '＋ '}
                        {p.emoji} {p.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          <PrimaryButton
            label={isEditing ? t('saveChanges') : t('create')}
            variant="action"
            onPress={handleSave}
            loading={saving}
          />
          {isEditing ? (
            <PrimaryButton label={t('delete')} variant="ghost" onPress={handleDelete} />
          ) : (
            <PrimaryButton label={t('cancel')} variant="ghost" onPress={() => navigation.goBack()} />
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
  weekRow: { flexDirection: 'row', gap: 6 },
  weekday: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayOn: { backgroundColor: colors.identity, borderColor: colors.identity },
  weekdayText: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  weekdayTextOn: { color: '#FFFFFF' },
  projChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  projChip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, maxWidth: 240 },
  projChipText: { ...typography.label, color: colors.textPrimary, fontWeight: '600' },
});
