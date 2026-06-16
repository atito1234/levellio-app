import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AddActivityFab, AddActivitySheet, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { usePlan } from '@/state/PlanContext';
import { useActivityLog } from '@/state/useActivityLog';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { groupHabitsIntoRails } from '@/lib/dashboard';
import { gapsFor } from '@/lib/plan';
import { completedActivityIds, sessionsForDay, sessionsOf } from '@/lib/analytics';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey, relativeDayLabel, shiftDayKey } from '@/lib/dates';
import { minutesToLabel } from '@/lib/schedule';
import type { Quest } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;

// Locked palette (gold reserved for 100% rings — never here).
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#E3E3EC';

export function PlanScreen({ route, navigation }: Props) {
  const { quests, character } = useGame();
  const { buckets, assignments } = useBuckets();
  const { getPlan, togglePlanned } = usePlan();
  const { events } = useActivityLog();
  const guardAbandon = useAbandonGuard();

  const todayK = dayKey(new Date());
  const tomorrowK = shiftDayKey(todayK, 1);
  const [targetDay, setTargetDay] = useState(() => (route.params?.day === tomorrowK ? tomorrowK : todayK));
  const [addOpen, setAddOpen] = useState(false);

  const allSessions = useMemo(() => sessionsOf(events), [events]);
  const planned = getPlan(targetDay);
  const plannedSet = useMemo(() => new Set(planned ?? []), [planned]);

  // Carry-over: only from an actual prior-day plan (avoid dumping every habit).
  const prevDay = shiftDayKey(targetDay, -1);
  const prevPlan = getPlan(prevDay);
  const gaps = useMemo(() => {
    if (!prevPlan) return [];
    const done = completedActivityIds(sessionsForDay(allSessions, prevDay));
    return gapsFor(quests, prevPlan, done).filter((q) => !plannedSet.has(q.id));
  }, [prevPlan, allSessions, prevDay, quests, plannedSet]);

  const rails = useMemo(() => groupHabitsIntoRails(quests, buckets, assignments), [quests, buckets, assignments]);

  const Segment = ({ label, value }: { label: string; value: string }) => {
    const active = targetDay === value;
    return (
      <Pressable
        onPress={() => setTargetDay(value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`Plan ${label}`}
        style={[styles.segment, active && styles.segmentOn]}
      >
        <Text style={[styles.segmentText, active && styles.segmentTextOn]}>{label}</Text>
      </Pressable>
    );
  };

  const onToggle = (quest: Quest, checked: boolean) => {
    // Un-planning a habit with a real streak earns a "think twice" pause.
    if (
      checked &&
      guardAbandon({
        kind: 'unplan',
        ctx: { streakDays: character?.streakDays ?? 0 },
        onProceed: () => void togglePlanned(targetDay, quest.id),
      })
    )
      return;
    void togglePlanned(targetDay, quest.id);
  };

  const Row = ({ quest }: { quest: Quest }) => {
    const checked = plannedSet.has(quest.id);
    return (
      <Pressable
        onPress={() => onToggle(quest, checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${quest.title}${quest.scheduledTime !== undefined ? `, at ${minutesToLabel(quest.scheduledTime)}` : ''}`}
        style={styles.row}
      >
        <View style={[styles.check, checked && styles.checkOn]}>
          {checked && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {quest.title}
          </Text>
          {quest.scheduledTime !== undefined && (
            <Text style={styles.rowTime}>⏰ {minutesToLabel(quest.scheduledTime)}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Plan your day
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      <View style={styles.segmentBar} accessibilityRole="tablist">
        <Segment label="Today" value={todayK} />
        <Segment label="Tomorrow" value={tomorrowK} />
      </View>
      <Text style={styles.count}>
        {plannedSet.size === 0
          ? `Nothing planned for ${relativeDayLabel(targetDay, todayK)} yet`
          : `${plannedSet.size} planned for ${relativeDayLabel(targetDay, todayK)}`}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {gaps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CARRY OVER {relativeDayLabel(prevDay, todayK).toUpperCase()}’S GAPS</Text>
            <Text style={styles.sectionHint}>Unfinished from your last plan — tap to add.</Text>
            <View style={styles.chips}>
              {gaps.map((q) => (
                <Pressable
                  key={q.id}
                  onPress={() => void togglePlanned(targetDay, q.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Carry over ${q.title}`}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>+ {q.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {rails.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>No habits yet. Create one to start planning.</Text>
          </View>
        ) : (
          rails.map((rail) => (
            <View key={rail.id} style={styles.section}>
              <Text style={styles.sectionLabel}>{rail.label.toUpperCase()}</Text>
              <View style={styles.rows}>
                {rail.habits.map((q) => (
                  <Row key={q.id} quest={q} />
                ))}
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={() => navigation.navigate('QuestEditor')}
          accessibilityRole="button"
          accessibilityLabel="Create a new habit"
          style={styles.newBtn}
        >
          <Text style={styles.newBtnText}>＋ New habit</Text>
        </Pressable>
      </ScrollView>

      <AddActivityFab onPress={() => setAddOpen(true)} />
      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  title: { ...typography.heading, color: INK },

  segmentBar: { flexDirection: 'row', backgroundColor: '#ECEAE4', borderRadius: 999, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: 999, alignItems: 'center' },
  segmentOn: { backgroundColor: CARD },
  segmentText: { ...typography.label, color: MUTED, fontWeight: '700' },
  segmentTextOn: { color: VIOLET },
  count: { ...typography.caption, color: MUTED, marginTop: spacing.sm, textAlign: 'center' },

  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  sectionHint: { ...typography.caption, color: MUTED },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { ...typography.label, color: VIOLET, fontWeight: '700' },

  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 18, padding: spacing.md },
  check: { width: 26, height: 26, borderRadius: 999, borderWidth: 2, borderColor: TRACK, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: VIOLET, borderColor: VIOLET },
  checkMark: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  rowIcon: { fontSize: 20 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600' },
  rowTime: { ...typography.caption, color: VIOLET, fontWeight: '700' },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 36 },
  emptyText: { ...typography.body, color: MUTED, textAlign: 'center' },

  newBtn: { alignSelf: 'center', paddingVertical: spacing.md },
  newBtnText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
