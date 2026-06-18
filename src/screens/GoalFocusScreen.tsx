import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AddActivityFab, AddActivitySheet, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals, useGoalProgress } from '@/state/GoalContext';
import { useProjects } from '@/state/ProjectsContext';
import { useActivityLog } from '@/state/useActivityLog';
import { goalColor, goalHabits, type Goal } from '@/lib/goal';
import { activityJourney } from '@/lib/journey';
import { sessionsOf } from '@/lib/analytics';
import { rippleForQuest } from '@/lib/habitCapacity';
import { getCapacity, type CapacityId } from '@/lib/compounding';
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
  const { quests, deleteQuest } = useGame();
  const { events } = useActivityLog();
  const { goals, membershipFor, setSupportingGoals } = useGoals();
  const { projectActivityIds } = useProjects();
  const progress = useGoalProgress(goal, projectActivityIds);

  const accent = goalColor(goal).accent;
  const todayK = dayKey(new Date());
  const sessions = useMemo(() => sessionsOf(events), [events]);
  const habits = useMemo(() => goalHabits(quests, goal, membershipFor(goal.id), projectActivityIds), [quests, goal, membershipFor, projectActivityIds]);

  // "Prepare with a personal goal" — only on project goals.
  const personalGoals = useMemo(() => goals.filter((g) => g.kind !== 'project'), [goals]);
  const supportingIds = goal.supportingGoalIds ?? [];
  const [prepOpen, setPrepOpen] = useState(false);
  const toggleSupporting = (sgId: string) =>
    void setSupportingGoals(goal.id, supportingIds.includes(sgId) ? supportingIds.filter((x) => x !== sgId) : [...supportingIds, sgId]);

  // The capacities these activities collectively power — the ripple that ties
  // them together (shared capacities = connected).
  const capIds = useMemo(() => {
    const set = new Set<CapacityId>();
    habits.forEach((h) => rippleForQuest(h).forEach((d) => set.add(d.capacityId)));
    return [...set].sort((a, b) => getCapacity(a).order - getCapacity(b).order);
  }, [habits]);

  const [addOpen, setAddOpen] = useState(false);

  const deleteActivity = (quest: Quest) =>
    Alert.alert('Remove activity?', `Remove “${quest.title}” from your activities?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void deleteQuest(quest.id) },
    ]);

  // Management row: tap to EDIT (never opens/does the activity); ✕ to remove.
  const ManageRow = ({ quest }: { quest: Quest }) => {
    const j = activityJourney(sessions, quest.id, quest.title, todayK);
    return (
      <View style={styles.row}>
        <Pressable
          onPress={() => navigation.navigate('QuestEditor', { questId: quest.id })}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${quest.title}`}
          style={styles.rowMainPress}
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
            ) : (
              <Text style={styles.rowEdit}>Tap to edit</Text>
            )}
          </View>
        </Pressable>
        <Pressable onPress={() => deleteActivity(quest)} accessibilityRole="button" accessibilityLabel={`Remove ${quest.title}`} hitSlop={10} style={styles.rowDelete}>
          <Text style={styles.rowDeleteText}>✕</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>YOUR JOURNEY</Text>
        <Pressable onPress={() => navigation.navigate('GoalEditor', { goalId: goal.id })} accessibilityRole="button" accessibilityLabel="Edit goal" hitSlop={12}>
          <Text style={[styles.editGoal, { color: accent }]}>✎ Edit</Text>
        </Pressable>
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
        {/* War strategy: prepare for battle (goal-level). Activity battles come later. */}
        <Pressable
          onPress={() => navigation.navigate('BattleSetup', { goalId: goal.id })}
          accessibilityRole="button"
          accessibilityLabel="Prepare your war strategy for this goal"
          style={[styles.battleCta, { backgroundColor: accent }]}
          disabled={habits.length === 0}
        >
          <Text style={styles.battleText}>⚔️ Prepare your war strategy</Text>
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

        {/* Prepare a project goal with a personal goal. */}
        {goal.kind === 'project' && personalGoals.length > 0 && (
          <View style={styles.prepCard}>
            <Text style={styles.sectionLabel}>PREPARING WITH</Text>
            <View style={styles.prepChips}>
              {personalGoals.filter((g) => supportingIds.includes(g.id)).map((g) => (
                <Pressable key={g.id} onPress={() => toggleSupporting(g.id)} accessibilityRole="button" accessibilityLabel={`Stop preparing with ${g.title}`} style={[styles.prepChip, { borderColor: goalColor(g).accent, backgroundColor: goalColor(g).soft }]}>
                  <Text style={[styles.prepChipText, { color: goalColor(g).accent }]}>{g.emoji} {g.title} ✓</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setPrepOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Add a personal goal to prepare with" style={styles.prepAdd}>
                <Text style={styles.prepAddText}>{prepOpen ? 'Done' : '＋ Prepare with a goal'}</Text>
              </Pressable>
            </View>
            {prepOpen && (
              <View style={styles.prepChips}>
                {personalGoals.filter((g) => !supportingIds.includes(g.id)).map((g) => (
                  <Pressable key={g.id} onPress={() => toggleSupporting(g.id)} accessibilityRole="button" accessibilityLabel={`Prepare with ${g.title}`} style={[styles.prepChip, { borderColor: goalColor(g).accent }]}>
                    <Text style={[styles.prepChipText, { color: goalColor(g).accent }]}>＋ {g.emoji} {g.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.prepHint}>Personal goals that help you get ready. In Settings, choose whether they just remind you or also feed this goal's progress.</Text>
          </View>
        )}

        {habits.length === 0 ? (
          <Text style={styles.empty}>No activities on this journey yet. Tap the 🎙️ button to add your first.</Text>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACTIVITIES ({habits.length})</Text>
            <View style={styles.rows}>
              {habits.map((q) => (
                <ManageRow key={q.id} quest={q} />
              ))}
            </View>
          </View>
        )}

        <Pressable onPress={() => navigation.navigate('GoalEditor')} accessibilityRole="button" accessibilityLabel="Create another goal" style={styles.newBtn}>
          <Text style={styles.newBtnText}>＋ New goal</Text>
        </Pressable>
      </ScrollView>

      <AddActivityFab onPress={() => setAddOpen(true)} accent={accent} highlight={habits.length === 0} />
      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} defaultGoalId={goal.id} />
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

  prepCard: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  prepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  prepChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 4, backgroundColor: CARD, maxWidth: 220 },
  prepChipText: { ...typography.caption, fontWeight: '800' },
  prepAdd: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4, backgroundColor: VIOLET_SOFT },
  prepAddText: { ...typography.caption, color: VIOLET, fontWeight: '800' },
  prepHint: { ...typography.caption, color: MUTED },
  rippleCard: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  capChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  capChip: { backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4 },
  capChipText: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  connectLink: { ...typography.label, color: VIOLET, fontWeight: '700' },

  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: CARD, borderRadius: 18, paddingRight: spacing.md },
  rowMainPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowIcon: { fontSize: 20 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600' },
  rowTime: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  rowStreak: { ...typography.caption, color: TEAL, fontWeight: '800' },
  rowEdit: { ...typography.caption, color: MUTED },
  rowDelete: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  rowDeleteText: { ...typography.label, color: '#C0202C', fontWeight: '800' },
  editGoal: { ...typography.label, fontWeight: '800' },


  newBtn: { alignSelf: 'center', paddingVertical: spacing.md },
  newBtnText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.lg },
});
