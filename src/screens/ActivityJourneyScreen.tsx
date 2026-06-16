import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { DotGrid, Sparkline } from '@/components/charts';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useActivityLog } from '@/state/useActivityLog';
import { sessionsOf } from '@/lib/analytics';
import { activityDayCells, activityJourney, activityWeeklyAdherence, HABIT_DAYS, type JourneyStatus } from '@/lib/journey';
import { SOLIDIFY_DAYS } from '@/lib/activityStreak';
import { dayKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityJourney'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const cardShadow = {
  shadowColor: '#1B1B2A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
} as const;

const STATUS_META: Record<JourneyStatus, { label: string; color: string }> = {
  graduated: { label: '🏅 Habit unlocked', color: '#B5740A' },
  solidified: { label: '🌱 Locked in', color: TEAL },
  building: { label: 'Building', color: VIOLET },
  new: { label: 'Just started', color: MUTED },
};

export function ActivityJourneyScreen({ route, navigation }: Props) {
  const { activityId } = route.params;
  const { quests } = useGame();
  const { events, ready } = useActivityLog();

  const data = useMemo(() => {
    const sessions = sessionsOf(events);
    const today = dayKey(new Date());
    const fromQuest = quests.find((q) => q.id === activityId)?.title;
    const fromSession = [...sessions].reverse().find((s) => s.activityId === activityId)?.title;
    const title = fromQuest ?? fromSession ?? 'Activity';
    return {
      title,
      journey: activityJourney(sessions, activityId, title, today),
      cells: activityDayCells(sessions, activityId, today, 35),
      adherence: activityWeeklyAdherence(sessions, activityId, today, 8),
    };
  }, [events, quests, activityId]);

  const j = data.journey;
  const status = STATUS_META[j.status];
  const hasHistory = j.totalDays > 0;
  const solidPct = (SOLIDIFY_DAYS / HABIT_DAYS) * 100;

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>FROM REPETITION TO HABIT</Text>
        <View style={styles.chevronSpacer} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {data.title}
      </Text>
      <View style={[styles.statusChip, { borderColor: status.color }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>Loading your journey…</Text>
        ) : !hasHistory ? (
          <View style={styles.card}>
            <Text style={styles.empty}>No reps logged yet. Do it once to start the path — every journey begins with day one.</Text>
          </View>
        ) : (
          <>
            {/* Progress toward automatic, with Day 21 / 66 markers. */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Toward automatic</Text>
                <Text style={styles.bigPct}>{j.progressPct}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.max(2, j.progressPct)}%` }]} />
                <View style={[styles.tick, { left: `${solidPct}%` }]} />
              </View>
              <View style={styles.markerRow}>
                <Text style={styles.marker}>Day 1</Text>
                <Text style={[styles.marker, styles.markerMid]}>Day {SOLIDIFY_DAYS}</Text>
                <Text style={styles.marker}>Day {HABIT_DAYS}</Text>
              </View>
              <Text style={styles.cardSub}>
                {j.graduated
                  ? 'This runs on its own now — automaticity reached.'
                  : `Day ${j.currentStreak} in a row. Automaticity averages ~${HABIT_DAYS} days — you’ll feel it before any number does.`}
              </Text>
            </View>

            {/* Real consistency — the user's own weekly trajectory. */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your consistency</Text>
              <Text style={styles.cardSub}>Days done per week — last 8 weeks</Text>
              <View style={styles.curveWrap}>
                <Sparkline values={data.adherence} color={VIOLET} />
              </View>
            </View>

            {/* Past days — real completion grid. */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Past days</Text>
                <Text style={styles.cardSub}>{data.cells.filter((c) => c.done).length}/{data.cells.length} closed</Text>
              </View>
              <DotGrid cells={data.cells} />
            </View>

            {/* Honest stat row. */}
            <View style={styles.statsRow}>
              <Stat value={`${j.currentStreak}`} label="day streak" tint={TEAL} />
              <Stat value={`${j.totalDays}`} label="days closed" />
              <Stat value={`${j.daysSinceStart}`} label="days on the path" tint={VIOLET} />
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate('Ripple', { questId: activityId })} accessibilityRole="button" accessibilityLabel="Do it now" style={styles.cta}>
                <Text style={styles.ctaText}>Do it now ›</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Connections', { questId: activityId })} accessibilityRole="button" accessibilityLabel="See how this connects" style={styles.secondary}>
                <Text style={styles.secondaryText}>🔗 See how this connects</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ value, label, tint = INK }: { value: string; label: string; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  title: { ...typography.heading, color: INK },
  statusChip: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.xs },
  statusText: { ...typography.caption, fontWeight: '800' },
  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  card: { backgroundColor: CARD, borderRadius: 20, padding: spacing.lg, gap: spacing.sm, ...cardShadow },
  cardTitle: { ...typography.title, color: INK, fontWeight: '800' },
  cardSub: { ...typography.caption, color: MUTED },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigPct: { ...typography.title, color: VIOLET, fontWeight: '800' },

  track: { height: 10, borderRadius: 5, backgroundColor: TRACK, overflow: 'visible', marginTop: 4 },
  trackFill: { height: 10, borderRadius: 5, backgroundColor: VIOLET },
  tick: { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: MUTED, opacity: 0.5 },
  markerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  marker: { ...typography.caption, color: MUTED, fontSize: 10 },
  markerMid: { marginLeft: -20 },

  curveWrap: { marginTop: spacing.xs },

  statsRow: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 20, paddingVertical: spacing.lg, ...cardShadow },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...typography.heading, fontWeight: '800' },
  statLabel: { ...typography.caption, color: MUTED, textAlign: 'center' },

  actions: { gap: spacing.sm },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: spacing.sm },
  secondaryText: { ...typography.label, color: VIOLET, fontWeight: '700' },

  empty: { ...typography.body, color: MUTED, textAlign: 'center' },
});
