import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { useProjects } from '@/state/ProjectsContext';
import { usePlan } from '@/state/PlanContext';
import { goalColor } from '@/lib/goal';
import { getBucketColor } from '@/lib/buckets';
import { dayKey } from '@/lib/dates';
import { WEEKDAY_LABELS } from '@/lib/calendar';
import { weekdayOfKey, weekdaysLabel } from '@/lib/recurrence';
import { minutesToLabel } from '@/lib/schedule';
import { MiniCalendar } from './MiniCalendar';
import { TimePicker } from './TimePicker';
import type { QuestCategory } from '@/types';
import type { QuestDraft } from '@/lib/questForm';
import type { RootStackParamList } from '@/navigation/types';

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

type WhenMode = 'today' | 'date' | 'weekly';
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_TIME = 9 * 60; // 9:00 AM

/**
 * "Add an activity" sheet: type or speak the name, choose WHEN (today, specific
 * calendar dates, or repeat on weekdays) + an optional time, optionally file it
 * under a goal and/or bucket, and add. Stays open for rapid multi-add. The full
 * editor (Advanced) and bulk capture stay reachable as secondary links.
 */
export function AddActivitySheet({
  visible,
  onClose,
  defaultGoalId = null,
  defaultBucketId = null,
  defaultDates = null,
  defaultProjectIds = null,
}: {
  visible: boolean;
  onClose: () => void;
  defaultGoalId?: string | null;
  defaultBucketId?: string | null;
  /** Pre-target specific calendar days (opens in "Pick date" mode with these selected). */
  defaultDates?: readonly string[] | null;
  /** Pre-link to projects (opens as a daily habit so it powers them every day). */
  defaultProjectIds?: readonly string[] | null;
}) {
  const { t } = useTranslation('addActivity');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { quests, addQuest } = useGame();
  const { goals, linkGoal } = useGoals();
  const { buckets, assignments, assignActivity } = useBuckets();
  const { signedIn, myProjects, linkHabit } = useProjects();
  const { getPlan, togglePlanned } = usePlan();
  const todayK = dayKey(new Date());

  // When opened from a project, we know exactly which project(s) to add to.
  const scopedProjects = useMemo(
    () => myProjects.filter((p) => (defaultProjectIds ?? []).includes(p.id)),
    [myProjects, defaultProjectIds],
  );

  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId);
  const [bucketId, setBucketId] = useState<string | null>(defaultBucketId);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [whenMode, setWhenMode] = useState<WhenMode>('today');
  const [pickedDates, setPickedDates] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeOn, setTimeOn] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(DEFAULT_TIME);
  const [added, setAdded] = useState<string | null>(null);

  // Re-sync to the opening context each time the sheet appears.
  React.useEffect(() => {
    if (visible) {
      setGoalId(defaultGoalId);
      setBucketId(defaultBucketId);
      const projects = defaultProjectIds ?? [];
      setProjectIds([...projects]);
      setTitle('');
      // Opened from a chosen calendar day → start in date mode on that day.
      // Opened from a project → start as a daily habit so it powers it every day.
      const dates = defaultDates ?? [];
      if (dates.length > 0) {
        // A specific day was chosen (e.g. from a calendar) → schedule just that day.
        setWhenMode('date');
        setPickedDates([...dates]);
        setWeekdays([]);
      } else if (projects.length > 0) {
        setWhenMode('weekly');
        setWeekdays([...ALL_DAYS]);
        setPickedDates([]);
      } else {
        setWhenMode('today');
        setPickedDates([]);
        setWeekdays([]);
      }
      setTimeOn(false);
      setTimeMinutes(DEFAULT_TIME);
      setAdded(null);
    }
  }, [visible, defaultGoalId, defaultBucketId, defaultDates, defaultProjectIds]);

  // Best category for a bucket = the most common category among its activities.
  const bucketCategory = useMemo(() => {
    return (id: string): QuestCategory => {
      const counts = new Map<QuestCategory, number>();
      for (const q of quests) {
        if (assignments[q.id] === id) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
      }
      let best: QuestCategory = 'health';
      let bestN = 0;
      for (const [cat, n] of counts) if (n > bestN) ((best = cat), (bestN = n));
      return best;
    };
  }, [quests, assignments]);

  const selectedGoal = goals.find((g) => g.id === goalId) ?? null;
  const category: QuestCategory = selectedGoal
    ? selectedGoal.categories[0] ?? 'health'
    : bucketId
      ? bucketCategory(bucketId)
      : 'health';

  // Can we add? Need a title, and for date/weekly modes a non-empty selection.
  const canAdd =
    title.trim().length > 0 &&
    (whenMode === 'today' || (whenMode === 'date' && pickedDates.length > 0) || (whenMode === 'weekly' && weekdays.length > 0));

  const toggleWeekday = (d: number) => setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const toggleDate = (key: string) => setPickedDates((cur) => (cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]));

  const add = async () => {
    const name = title.trim();
    if (!canAdd) return;
    // Adding to a project (chips) or a project goal → make it a daily habit so it
    // powers the project every day and shows in the project goal + calendars.
    const isProjectGoal = selectedGoal?.kind === 'project';
    const projectScoped = projectIds.length > 0 || isProjectGoal;
    const draft: QuestDraft = {
      title: name,
      category,
      difficulty: 'easy',
      ...(timeOn ? { scheduledTime: timeMinutes } : {}),
      // Daily recurrence for project-scoped adds — unless a specific day was picked.
      ...(whenMode === 'weekly' ? { scheduledDays: weekdays } : projectScoped && whenMode !== 'date' ? { scheduledDays: ALL_DAYS } : {}),
    };
    const quest = await addQuest(draft);
    if (quest) {
      if (bucketId) await assignActivity(quest.id, bucketId);
      // File it into the chosen goal (explicit membership works for any kind),
      // and link it to the underlying project for a project goal.
      if (selectedGoal) {
        await linkGoal(quest.id, selectedGoal.id);
        if (selectedGoal.kind === 'project' && selectedGoal.projectId) await linkHabit(quest.id, selectedGoal.projectId);
      }
      // Power any community projects chosen — completions will now contribute.
      for (const pid of projectIds) await linkHabit(quest.id, pid);
      if (whenMode === 'date') {
        for (const d of pickedDates) await togglePlanned(d, quest.id);
      } else if (projectScoped || whenMode === 'today') {
        await togglePlanned(todayK, quest.id);
      } else if (whenMode === 'weekly' && weekdays.includes(weekdayOfKey(todayK))) {
        // Show it today too if today is one of the repeat days.
        await togglePlanned(todayK, quest.id);
      }
      setAdded(name);
    }
    setTitle('');
  };

  // Carry the chosen goal / group / projects so Advanced + bulk add file there too.
  const context = {
    ...(goalId ? { goalId } : {}),
    ...(bucketId ? { bucketId } : {}),
    ...(projectIds.length > 0 ? { projectIds } : {}),
  };

  const openAdvanced = () => {
    const prefill: Partial<QuestDraft> = {
      ...(title.trim() ? { title: title.trim() } : {}),
      category,
      ...(timeOn ? { scheduledTime: timeMinutes } : {}),
      ...(whenMode === 'weekly' && weekdays.length ? { scheduledDays: weekdays } : {}),
    };
    onClose();
    navigation.navigate('QuestEditor', { prefill, ...context });
  };

  const modeChip = (mode: WhenMode, label: string) => {
    const on = whenMode === mode;
    return (
      <Pressable
        key={mode}
        onPress={() => setWhenMode(mode)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={[styles.chip, on && styles.chipOn]}
      >
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Tap the dimmed area above the sheet to dismiss. */}
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{t('title')}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('done')} hitSlop={12}>
              <Text style={styles.done}>{t('done')}</Text>
            </Pressable>
          </View>

          {/* Everything between the title and the Add button scrolls, so all the
              options are reachable above the keyboard. */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                if (added) setAdded(null);
              }}
              placeholder={t('placeholder')}
              placeholderTextColor={MUTED}
              style={styles.input}
              autoFocus
              maxLength={60}
              onSubmitEditing={() => void add()}
              returnKeyType="done"
              blurOnSubmit={false}
              accessibilityLabel={t('nameLabel')}
            />

            {scopedProjects.length > 0 && (
              <View style={styles.scopeBanner}>
                <Text style={styles.scopeText} numberOfLines={2}>
                  {t('scopeBanner', { projects: scopedProjects.map((p) => `${p.emoji} ${p.title}`).join(', ') })}
                </Text>
              </View>
            )}

            {/* WHEN — today / a specific date / repeat weekly. */}
            <Text style={styles.label}>{t('when')}</Text>
            <View style={styles.chips}>
              {modeChip('today', t('today'))}
              {modeChip('date', t('pickDate'))}
              {modeChip('weekly', t('repeat'))}
            </View>

            {whenMode === 'date' && (
              <MiniCalendar selected={pickedDates} onToggle={toggleDate} min={todayK} todayKey={todayK} />
            )}

            {whenMode === 'weekly' && (
              <>
                <View style={styles.weekRow}>
                  {WEEKDAY_LABELS.map((d, i) => {
                    const on = weekdays.includes(i);
                    return (
                      <Pressable
                        key={i}
                        onPress={() => toggleWeekday(i)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`Repeat on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}`}
                        style={[styles.weekday, on && styles.weekdayOn]}
                      >
                        <Text style={[styles.weekdayText, on && styles.weekdayTextOn]}>{d}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.weekFoot}>
                  <Text style={styles.weekSummary}>{weekdays.length ? weekdaysLabel(weekdays) : t('pickDays')}</Text>
                  <Pressable onPress={() => setWeekdays(weekdays.length === 7 ? [] : ALL_DAYS)} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.everyDay}>{weekdays.length === 7 ? t('clear') : t('everyDay')}</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Optional time of day (all modes). */}
            <Pressable
              onPress={() => setTimeOn((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: timeOn }}
              style={styles.timeToggle}
            >
              <Text style={styles.timeToggleText}>⏰ {timeOn ? minutesToLabel(timeMinutes) : t('setTime')}</Text>
              <Text style={styles.timeToggleHint}>{timeOn ? t('tapToRemove') : t('anyTime')}</Text>
            </Pressable>
            {timeOn && <TimePicker minutes={timeMinutes} onChange={setTimeMinutes} />}

            {goals.length > 0 && (
              <>
                <Text style={styles.label}>{t('goalOptional')}</Text>
                <View style={styles.chips}>
                  {goals.map((g) => {
                    const on = goalId === g.id;
                    const c = goalColor(g);
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => setGoalId(on ? null : g.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.chip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                      >
                        <Text style={[styles.chipText, on && { color: c.accent }]}>
                          {g.emoji} {g.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {buckets.length > 0 && (
              <>
                <Text style={styles.label}>{t('groupOptional')}</Text>
                <View style={styles.chips}>
                  {buckets.map((b) => {
                    const on = bucketId === b.id;
                    const c = getBucketColor(b.colorId);
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => setBucketId(on ? null : b.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.chip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                      >
                        <Text style={[styles.chipText, on && { color: c.accent }]}>{b.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {signedIn && myProjects.length > 0 && (
              <>
                <Text style={styles.label}>{t('contributesTo')}</Text>
                <View style={styles.chips}>
                  {myProjects.map((p) => {
                    const on = projectIds.includes(p.id);
                    const c = getBucketColor(p.colorId);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setProjectIds((cur) => (on ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.chip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                      >
                        <Text style={[styles.chipText, on && { color: c.accent }]}>
                          {p.emoji} {p.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {projectIds.length > 0 && (
                  <Text style={styles.pledge}>{t('pledge', { count: projectIds.length })}</Text>
                )}
              </>
            )}

            {added && <Text style={styles.added}>{t('added', { name: added })}</Text>}

            <View style={styles.links}>
              <Pressable onPress={openAdvanced} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.link}>{t('advanced')}</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Pinned below the scroll area — always visible above the keyboard. */}
          <Pressable
            onPress={() => void add()}
            disabled={!canAdd}
            accessibilityRole="button"
            accessibilityLabel={t('addActivityA11y')}
            style={[styles.addBtn, !canAdd && styles.addBtnOff]}
          >
            <Text style={styles.addBtnText}>{t('addActivity')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    maxHeight: '90%',
  },
  scrollArea: { flexShrink: 1 },
  scrollBody: { gap: spacing.sm, paddingBottom: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.heading, color: INK },
  done: { ...typography.label, color: VIOLET, fontWeight: '800' },
  input: { ...typography.title, color: INK, backgroundColor: CARD, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  label: { ...typography.label, color: MUTED, letterSpacing: 1, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.label, color: INK, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '800' },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: TRACK, alignItems: 'center', justifyContent: 'center' },
  weekdayOn: { backgroundColor: VIOLET, borderColor: VIOLET },
  weekdayText: { ...typography.label, color: INK, fontWeight: '700' },
  weekdayTextOn: { color: '#FFFFFF' },
  weekFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekSummary: { ...typography.caption, color: MUTED, fontWeight: '700' },
  everyDay: { ...typography.label, color: VIOLET, fontWeight: '800' },
  timeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: TRACK,
  },
  timeToggleText: { ...typography.label, color: INK, fontWeight: '700' },
  timeToggleHint: { ...typography.caption, color: MUTED },
  added: { ...typography.caption, color: '#0A6E5C', fontWeight: '700' },
  pledge: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  scopeBanner: { backgroundColor: VIOLET_SOFT, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scopeText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, gap: spacing.sm },
  link: { ...typography.label, color: VIOLET, fontWeight: '700' },
  addBtn: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
});
