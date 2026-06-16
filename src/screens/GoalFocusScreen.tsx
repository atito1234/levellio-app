import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useGoals, useGoalProgress } from '@/state/GoalContext';
import { useActivityLog } from '@/state/useActivityLog';
import { goalHabits, type Goal } from '@/lib/goal';
import { activityJourney } from '@/lib/journey';
import { sessionsOf } from '@/lib/analytics';
import { rippleForQuest } from '@/lib/habitCapacity';
import { getCapacity, type CapacityId } from '@/lib/compounding';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { minutesToLabel } from '@/lib/schedule';
import type { Quest, QuestCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalFocus'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

export function GoalFocusScreen({ route, navigation }: Props) {
  const { goalId } = route.params;
  const { goals } = useGoals();
  const goal = goals.find((g) => g.id === goalId);

  if (!goal) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <View style={styles.chevronSpacer} />
        </View>
        <Text style={styles.empty}>This goal is no longer available.</Text>
      </ScreenContainer>
    );
  }

  return <GoalFocusBody goal={goal} navigation={navigation} />;
}

function GoalFocusBody({ goal, navigation }: { goal: Goal; navigation: Props['navigation'] }) {
  const { quests, addQuest } = useGame();
  const { getPlan, togglePlanned } = usePlan();
  const { events } = useActivityLog();
  const progress = useGoalProgress(goal);

  const accent = goal.colorId === 'teal' ? TEAL : VIOLET;
  const todayK = dayKey(new Date());
  const sessions = useMemo(() => sessionsOf(events), [events]);
  const plannedSet = useMemo(() => new Set(getPlan(todayK) ?? []), [getPlan, todayK]);
  const habits = useMemo(() => goalHabits(quests, goal), [quests, goal]);
  const inPlan = habits.filter((h) => plannedSet.has(h.id));
  const notPlanned = habits.filter((h) => !plannedSet.has(h.id));

  // The capacities these activities collectively power — the ripple that ties
  // them together (shared capacities = connected).
  const capIds = useMemo(() => {
    const set = new Set<CapacityId>();
    habits.forEach((h) => rippleForQuest(h).forEach((d) => set.add(d.capacityId)));
    return [...set].sort((a, b) => getCapacity(a).order - getCapacity(b).order);
  }, [habits]);

  // Inline "add any activity to this journey".
  const addCats: QuestCategory[] = goal.categories.length > 0 ? goal.categories : ['health'];
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCat, setDraftCat] = useState<QuestCategory>(addCats[0]!);

  const addActivity = async () => {
    const title = draftTitle.trim();
    if (title.length === 0) return;
    const quest = await addQuest({ title, category: draftCat, difficulty: 'easy' });
    if (quest) await togglePlanned(todayK, quest.id); // straight onto the path
    setDraftTitle('');
    setAdding(false);
  };

  const PlanRow = ({ quest }: { quest: Quest }) => {
    const j = activityJourney(sessions, quest.id, quest.title, todayK);
    return (
      <Pressable
        onPress={() => navigation.navigate('Ripple', { questId: quest.id })}
        accessibilityRole="button"
        accessibilityLabel={`${quest.title}${quest.completed ? ', done today' : ', do it now'}${j.currentStreak > 0 ? `, ${j.currentStreak} day streak` : ''}`}
        style={styles.row}
      >
        <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {quest.title}
          </Text>
          {j.currentStreak > 0 ? (
            <Text style={styles.rowStreak}>🔥 Day {j.currentStreak}{j.graduated ? ' · runs on its own' : j.solidified ? ' · locked in' : ''}</Text>
          ) : quest.scheduledTime !== undefined ? (
            <Text style={styles.rowTime}>⏰ {minutesToLabel(quest.scheduledTime)}</Text>
          ) : null}
        </View>
        <Text style={[styles.action, quest.completed && styles.actionDone]}>{quest.completed ? '✓ Done' : 'Do it ›'}</Text>
      </Pressable>
    );
  };

  const AddRow = ({ quest }: { quest: Quest }) => {
    const j = activityJourney(sessions, quest.id, quest.title, todayK);
    return (
      <Pressable
        onPress={() => void togglePlanned(todayK, quest.id)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${quest.title} to today's path`}
        style={styles.row}
      >
        <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {quest.title}
          </Text>
          {j.currentStreak > 0 && <Text style={styles.rowStreak}>🔥 Day {j.currentStreak}</Text>}
        </View>
        <Text style={styles.addAction}>+ Add</Text>
      </Pressable>
    );
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>YOUR JOURNEY</Text>
        <View style={styles.chevronSpacer} />
      </View>

      <View style={styles.header}>
        <Text style={styles.emoji}>{goal.emoji}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {goal.title}
        </Text>
        <Text
          style={styles.sub}
          accessibilityLabel={`${progress.doneTodayInGoal} of ${progress.plannedTodayInGoal} done today. ${progress.weeklyConsistencyPct} percent consistent this week.`}
        >
          {progress.doneTodayInGoal}/{progress.plannedTodayInGoal} today · {progress.weeklyConsistencyPct}% this week
        </Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { backgroundColor: accent, width: `${Math.max(3, progress.weeklyConsistencyPct)}%` }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Slay-the-dragon CTA: the journey IS the battle. */}
        <Pressable
          onPress={() => navigation.navigate('BattleSetup', { goalId: goal.id })}
          accessibilityRole="button"
          accessibilityLabel="Begin a battle for this goal"
          style={[styles.battleCta, { backgroundColor: accent }]}
          disabled={habits.length === 0}
        >
          <Text style={styles.battleText}>⚔️ Begin a battle — slay what blocks this</Text>
        </Pressable>

        {/* The ripple: capacities these activities power together. */}
        {capIds.length > 0 && (
          <View style={styles.rippleCard}>
            <Text style={styles.sectionLabel}>THIS JOURNEY POWERS</Text>
            <View style={styles.capChips}>
              {capIds.slice(0, 6).map((id) => (
                <View key={id} style={styles.capChip}>
                  <Text style={styles.capChipText}>{getCapacity(id).name}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => navigation.navigate('Connections')} accessibilityRole="button" accessibilityLabel="See how these activities connect" hitSlop={8}>
              <Text style={styles.connectLink}>🔗 See how these activities connect ›</Text>
            </Pressable>
          </View>
        )}

        {habits.length === 0 && (
          <Text style={styles.empty}>No activities on this journey yet. Add your first one below.</Text>
        )}

        {inPlan.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ON THE PATH TODAY</Text>
            <View style={styles.rows}>
              {inPlan.map((q) => (
                <PlanRow key={q.id} quest={q} />
              ))}
            </View>
          </View>
        )}

        {notPlanned.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>READY TO ADD</Text>
            <View style={styles.rows}>
              {notPlanned.map((q) => (
                <AddRow key={q.id} quest={q} />
              ))}
            </View>
          </View>
        )}

        {/* Add ANY new activity, tied to this journey (so it powers the ripple). */}
        {adding ? (
          <View style={styles.addCard}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="New activity (e.g. 10 push-ups)"
              placeholderTextColor={MUTED}
              style={styles.addInput}
              autoFocus
              maxLength={60}
              onSubmitEditing={() => void addActivity()}
              returnKeyType="done"
              accessibilityLabel="New activity title"
            />
            {addCats.length > 1 && (
              <View style={styles.catChips}>
                {addCats.map((c) => {
                  const on = draftCat === c;
                  return (
                    <Pressable key={c} onPress={() => setDraftCat(c)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.catChip, on && styles.catChipOn]}>
                      <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
                        {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={styles.addActions}>
              <Pressable onPress={() => { setAdding(false); setDraftTitle(''); }} accessibilityRole="button" style={styles.addCancel}>
                <Text style={styles.addCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void addActivity()} disabled={draftTitle.trim().length === 0} accessibilityRole="button" style={[styles.addConfirm, draftTitle.trim().length === 0 && styles.addConfirmOff]}>
                <Text style={styles.addConfirmText}>Add to journey</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="Add an activity to this journey" style={styles.addOpen}>
            <Text style={styles.addOpenText}>＋ Add an activity to this journey</Text>
          </Pressable>
        )}

        <Pressable onPress={() => navigation.navigate('GoalEditor')} accessibilityRole="button" accessibilityLabel="Create another goal" style={styles.newBtn}>
          <Text style={styles.newBtnText}>＋ New goal</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },

  header: { alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.md },
  emoji: { fontSize: 40 },
  title: { ...typography.heading, color: INK, textAlign: 'center' },
  sub: { ...typography.body, color: MUTED },
  bar: { width: '80%', height: 8, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden', marginTop: 4 },
  barFill: { height: 8, borderRadius: 999 },

  content: { gap: spacing.lg, paddingBottom: spacing.xl },

  battleCta: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  battleText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },

  rippleCard: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  capChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  capChip: { backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4 },
  capChipText: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  connectLink: { ...typography.label, color: VIOLET, fontWeight: '700' },

  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 18, padding: spacing.md },
  rowIcon: { fontSize: 20 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600' },
  rowTime: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  rowStreak: { ...typography.caption, color: TEAL, fontWeight: '800' },
  action: { ...typography.label, color: VIOLET, fontWeight: '700' },
  actionDone: { color: MUTED },
  addAction: { ...typography.label, color: VIOLET, fontWeight: '700', backgroundColor: VIOLET_SOFT, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },

  addOpen: { alignItems: 'center', backgroundColor: CARD, borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: TRACK, borderStyle: 'dashed' },
  addOpenText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  addCard: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  addInput: { ...typography.body, color: INK, backgroundColor: BG, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: { backgroundColor: BG, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: TRACK },
  catChipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  catChipText: { ...typography.caption, color: MUTED, fontWeight: '700' },
  catChipTextOn: { color: VIOLET },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  addCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addCancelText: { ...typography.label, color: MUTED, fontWeight: '700' },
  addConfirm: { backgroundColor: VIOLET, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  addConfirmOff: { opacity: 0.4 },
  addConfirmText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },

  newBtn: { alignSelf: 'center', paddingVertical: spacing.md },
  newBtnText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.lg },
});
