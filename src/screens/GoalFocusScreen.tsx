import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useGoals, useGoalProgress } from '@/state/GoalContext';
import { goalHabits } from '@/lib/goal';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { minutesToLabel } from '@/lib/schedule';
import type { Quest } from '@/types';
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
  const { quests } = useGame();
  const { getPlan, togglePlanned } = usePlan();

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

  return <GoalFocusBody goal={goal} quests={quests} getPlan={getPlan} togglePlanned={togglePlanned} navigation={navigation} />;
}

function GoalFocusBody({
  goal,
  quests,
  getPlan,
  togglePlanned,
  navigation,
}: {
  goal: NonNullable<ReturnType<typeof useGoals>['goals'][number]>;
  quests: Quest[];
  getPlan: (day: string) => string[] | undefined;
  togglePlanned: (day: string, id: string) => Promise<void>;
  navigation: Props['navigation'];
}) {
  const progress = useGoalProgress(goal);
  const accent = goal.colorId === 'teal' ? TEAL : VIOLET;
  const todayK = dayKey(new Date());
  const plannedSet = useMemo(() => new Set(getPlan(todayK) ?? []), [getPlan, todayK]);
  const habits = useMemo(() => goalHabits(quests, goal), [quests, goal]);
  const inPlan = habits.filter((h) => plannedSet.has(h.id));
  const notPlanned = habits.filter((h) => !plannedSet.has(h.id));

  const PlanRow = ({ quest }: { quest: Quest }) => (
    <Pressable
      onPress={() => navigation.navigate('Ripple', { questId: quest.id })}
      accessibilityRole="button"
      accessibilityLabel={`${quest.title}${quest.completed ? ', done today' : ', do it now'}`}
      style={styles.row}
    >
      <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {quest.title}
        </Text>
        {quest.scheduledTime !== undefined && <Text style={styles.rowTime}>⏰ {minutesToLabel(quest.scheduledTime)}</Text>}
      </View>
      <Text style={[styles.action, quest.completed && styles.actionDone]}>{quest.completed ? '✓ Done' : 'Do it ›'}</Text>
    </Pressable>
  );

  const AddRow = ({ quest }: { quest: Quest }) => (
    <Pressable
      onPress={() => void togglePlanned(todayK, quest.id)}
      accessibilityRole="button"
      accessibilityLabel={`Add ${quest.title} to today's plan`}
      style={styles.row}
    >
      <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {quest.title}
        </Text>
      </View>
      <Text style={styles.addAction}>+ Add</Text>
    </Pressable>
  );

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>GOAL</Text>
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
          <View
            style={[
              styles.barFill,
              { backgroundColor: accent, width: `${Math.max(3, progress.weeklyConsistencyPct)}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {habits.length === 0 ? (
          <Text style={styles.empty}>No habits feed this goal yet. Add ones in {goal.categories.map((c) => CATEGORY_META[c].label).join(' / ')}.</Text>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>IN TODAY’S PLAN</Text>
              {inPlan.length === 0 ? (
                <Text style={styles.sectionHint}>None planned today — add one below to move this goal forward.</Text>
              ) : (
                <View style={styles.rows}>
                  {inPlan.map((q) => (
                    <PlanRow key={q.id} quest={q} />
                  ))}
                </View>
              )}
            </View>

            {notPlanned.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>NOT PLANNED YET</Text>
                <View style={styles.rows}>
                  {notPlanned.map((q) => (
                    <AddRow key={q.id} quest={q} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <Pressable
          onPress={() => navigation.navigate('GoalEditor')}
          accessibilityRole="button"
          accessibilityLabel="Create another goal"
          style={styles.newBtn}
        >
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
  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  sectionHint: { ...typography.caption, color: MUTED },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 18, padding: spacing.md },
  rowIcon: { fontSize: 20 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600' },
  rowTime: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  action: { ...typography.label, color: VIOLET, fontWeight: '700' },
  actionDone: { color: MUTED },
  addAction: { ...typography.label, color: VIOLET, fontWeight: '700', backgroundColor: VIOLET_SOFT, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },

  newBtn: { alignSelf: 'center', paddingVertical: spacing.md },
  newBtnText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.lg },
});
