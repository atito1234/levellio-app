import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useActivityLog } from '@/state/useActivityLog';
import { byActivity, byCategory, hourLabel, sessionsOf, summarize, weekdayLabel } from '@/lib/analytics';
import { activityStreakDays } from '@/lib/activityStreak';
import {
  activeDaysInWindow,
  daysAccomplished,
  directionVerdict,
  longestDayStreak,
  nextLockedTier,
  tierStatus,
  unlockedCount,
  weekCells,
  INSIGHT_TIERS,
  type DirectionTone,
  type InsightTier,
} from '@/lib/heroAnalytics';
import { CATEGORY_META, resolveCategory } from '@/lib/categories';
import { dayKey, shiftDayKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Analytics'>;
type Goals = ReturnType<typeof useGoals>['goals'];

interface ScreenData {
  sessions: ReturnType<typeof sessionsOf>;
  today: string;
  daysDone: number;
  streakDays: number;
  activeThisWeek: number;
  activePrevWeek: number;
  cells: ReturnType<typeof weekCells>;
  summary: ReturnType<typeof summarize>;
  activities: ReturnType<typeof byActivity>;
  categories: ReturnType<typeof byCategory>;
  longest: number;
}

// Locked palette (gold stays reserved for 100% rings).
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const TEAL = '#16C8A8';
const TEAL_SOFT = '#D6F7EF';
const MUTED = '#5A5A72';
const LOCK = '#9A9AAE';

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const TONE: Record<DirectionTone, { accent: string; soft: string; emoji: string }> = {
  onTrack: { accent: TEAL, soft: TEAL_SOFT, emoji: '🚀' },
  building: { accent: VIOLET, soft: VIOLET_SOFT, emoji: '📈' },
  drifting: { accent: '#B5740A', soft: '#FBEFD6', emoji: '🌱' },
  start: { accent: VIOLET, soft: VIOLET_SOFT, emoji: '🧭' },
};

export function AnalyticsScreen({ navigation }: Props) {
  const { character } = useGame();
  const { goals } = useGoals();
  const { events, ready } = useActivityLog();

  const data = useMemo<ScreenData>(() => {
    const sessions = sessionsOf(events);
    const today = dayKey(new Date());
    const daysDone = daysAccomplished(sessions);
    return {
      sessions,
      today,
      daysDone,
      streakDays: character?.streakDays ?? 0,
      activeThisWeek: activeDaysInWindow(sessions, today, 7),
      activePrevWeek: activeDaysInWindow(sessions, shiftDayKey(today, -7), 7),
      cells: weekCells(sessions, today),
      summary: summarize(sessions),
      activities: byActivity(sessions),
      categories: byCategory(sessions),
      longest: longestDayStreak(sessions),
    };
  }, [events, character?.streakDays]);

  const direction = directionVerdict({
    daysDone: data.daysDone,
    streakDays: data.streakDays,
    activeThisWeek: data.activeThisWeek,
    activePrevWeek: data.activePrevWeek,
  });
  const tone = TONE[direction.tone];
  const closedThisWeek = data.cells.filter((c) => c.done).length;
  const next = nextLockedTier(data.daysDone);

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>YOUR ANALYTICS</Text>
        <View style={styles.chevronSpacer} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Headed the right way?
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>Reading your journey…</Text>
        ) : (
          <>
            {/* The 3-second reflection. */}
            <View style={[styles.verdictCard, { backgroundColor: tone.soft, borderColor: tone.accent }]}>
              <Text style={styles.verdictEmoji}>{tone.emoji}</Text>
              <Text style={[styles.verdictLabel, { color: tone.accent }]}>{direction.label}</Text>
              <Text style={styles.verdictReason}>{direction.reason}</Text>
            </View>

            {/* This week + the headline counters. */}
            <View style={styles.weekCard}>
              <View style={styles.weekHead}>
                <Text style={styles.cardTitle}>This week</Text>
                <Text style={styles.weekCount}>{closedThisWeek}/7 days</Text>
              </View>
              <View style={styles.weekRow}>
                {data.cells.map((c) => (
                  <View key={c.key} style={styles.weekCell}>
                    <View
                      style={[styles.dot, c.done && styles.dotDone, c.isToday && styles.dotToday]}
                      accessibilityLabel={`${weekdayLabel(c.weekday)} ${c.done ? 'active' : 'rest'}`}
                    >
                      {c.done && <Text style={styles.dotCheck}>✓</Text>}
                    </View>
                    <Text style={[styles.dayLetter, c.isToday && styles.dayLetterToday]}>{WEEKDAY_LETTER[c.weekday]}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.counterRow}>
                <Counter value={`${data.daysDone}`} label="days accomplished" />
                <Counter value={`${data.streakDays}`} label="day streak" tint={TEAL} />
                <Counter value={`${unlockedCount(data.daysDone)}/${INSIGHT_TIERS.length}`} label="insights unlocked" tint={VIOLET} />
              </View>
            </View>

            {/* Progress toward the next unlock. */}
            {next ? (
              <View style={styles.nextCard}>
                <Text style={styles.nextText}>
                  {next.icon} <Text style={styles.nextStrong}>{next.title}</Text> unlocks in{' '}
                  {tierStatus(next, data.daysDone).daysToGo} more {tierStatus(next, data.daysDone).daysToGo === 1 ? 'day' : 'days'}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${Math.round((data.daysDone / next.unlockDays) * 100)}%` }]} />
                </View>
                <Text style={styles.nextSub}>Keep showing up — insights unlock as your days add up.</Text>
              </View>
            ) : (
              <View style={styles.nextCard}>
                <Text style={styles.nextText}>🎉 Every insight unlocked. You’ve built a real practice.</Text>
              </View>
            )}

            {/* Milestone-gated insights. */}
            <Text style={styles.sectionLabel}>WHAT YOUR DATA SAYS</Text>
            {INSIGHT_TIERS.map((tier) => {
              const st = tierStatus(tier, data.daysDone);
              if (!st.unlocked) return <LockedCard key={tier.id} tier={tier} daysDone={data.daysDone} />;
              return <InsightCard key={tier.id} tier={tier} data={data} goals={goals} />;
            })}

            <Pressable
              onPress={() => navigation.navigate('Insights')}
              accessibilityRole="button"
              accessibilityLabel="See full activity insights"
              style={styles.fullLink}
            >
              <Text style={styles.fullLinkText}>📊 See full activity insights ›</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Counter({ value, label, tint = INK }: { value: string; label: string; tint?: string }) {
  return (
    <View style={styles.counter}>
      <Text style={[styles.counterValue, { color: tint }]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

function LockedCard({ tier, daysDone }: { tier: InsightTier; daysDone: number }) {
  const toGo = tier.unlockDays - daysDone;
  return (
    <View style={[styles.insightCard, styles.lockedCard]} accessibilityLabel={`${tier.title}, locked. ${toGo} days to unlock.`}>
      <View style={styles.insightHead}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>{tier.title}</Text>
        <Text style={styles.lockBadge}>{toGo}d to go</Text>
      </View>
      <Text style={styles.lockedTeaser}>{tier.teaser}</Text>
      <View style={styles.track}>
        <View style={[styles.trackFill, styles.trackFillLock, { width: `${Math.round((daysDone / tier.unlockDays) * 100)}%` }]} />
      </View>
      <Text style={styles.lockedHint}>Unlocks at {tier.unlockDays} days accomplished</Text>
    </View>
  );
}

function InsightCard({ tier, data, goals }: { tier: InsightTier; data: ScreenData; goals: Goals }) {
  const body = renderInsight(tier, data, goals);
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHead}>
        <Text style={styles.insightIcon}>{tier.icon}</Text>
        <Text style={styles.insightTitle}>{tier.title}</Text>
      </View>
      {body}
    </View>
  );
}

function renderInsight(tier: InsightTier, data: ScreenData, goals: Goals): React.ReactNode {
  switch (tier.id) {
    case 'streak':
      return (
        <Text style={styles.insightBody}>
          {data.streakDays > 0
            ? `You’re on a ${data.streakDays}-day streak. Your longest run so far is ${data.longest} ${data.longest === 1 ? 'day' : 'days'}.`
            : `Your streak reset — your longest run was ${data.longest} ${data.longest === 1 ? 'day' : 'days'}. One win today starts the next.`}
        </Text>
      );
    case 'rhythm': {
      const { bestWeekday, bestHour } = data.summary;
      if (bestWeekday === null && bestHour === null) {
        return <Text style={styles.insightBody}>Keep logging with the timer to reveal your best day and time.</Text>;
      }
      const day = bestWeekday !== null ? weekdayLabel(bestWeekday) : null;
      const hr = bestHour !== null ? hourLabel(bestHour) : null;
      return (
        <Text style={styles.insightBody}>
          You show up most {day ? `on ${day}s` : ''}{day && hr ? ', around ' : hr ? 'around ' : ''}
          {hr ?? ''}. Stack new habits there — momentum is on your side.
        </Text>
      );
    }
    case 'anchor': {
      const top = data.activities[0];
      if (!top) return <Text style={styles.insightBody}>Complete a few sessions to find your anchor habit.</Text>;
      return (
        <Text style={styles.insightBody}>
          <Text style={styles.bodyStrong}>{top.title}</Text> is your anchor — {top.summary.count}{' '}
          {top.summary.count === 1 ? 'session' : 'sessions'} logged. Anchor habits make the rest easier to start.
        </Text>
      );
    }
    case 'mix': {
      const top = data.categories[0];
      if (!top) return <Text style={styles.insightBody}>As you log across areas, your focus will show up here.</Text>;
      const cat = resolveCategory(top.category);
      const meta = CATEGORY_META[cat];
      const goal = goals.find((g) => g.categories.includes(cat));
      return (
        <Text style={styles.insightBody}>
          Most of your energy goes to <Text style={styles.bodyStrong}>{meta?.label ?? top.category}</Text>{' '}
          ({top.summary.count} {top.summary.count === 1 ? 'session' : 'sessions'}).
          {goal ? ` That directly feeds your goal “${goal.title}.”` : ' Tie it to a goal to make it count double.'}
        </Text>
      );
    }
    case 'resilience': {
      const atBest = data.streakDays > 0 && data.streakDays >= data.longest;
      return (
        <Text style={styles.insightBody}>
          Your longest unbroken run is <Text style={styles.bodyStrong}>{data.longest} days</Text>.{' '}
          {atBest
            ? 'You’re at your best right now — protect the streak.'
            : `You’ve done it before, so you can do it again — you’re ${data.streakDays} ${data.streakDays === 1 ? 'day' : 'days'} in now.`}
        </Text>
      );
    }
    case 'automatic': {
      const top = data.activities[0];
      const streak = top ? activityStreakDays(data.sessions, top.activityId, data.today) : 0;
      const pct = Math.min(100, Math.round((streak / 66) * 100));
      return (
        <>
          <Text style={styles.insightBody}>
            {top ? (
              <>
                <Text style={styles.bodyStrong}>{top.title}</Text> is {streak} {streak === 1 ? 'day' : 'days'} in a row.
              </>
            ) : (
              'Habits become automatic with repetition.'
            )}{' '}
            Research suggests automaticity lands on average around 66 days — but you’ll feel it before any number does.
          </Text>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${pct}%` }]} />
          </View>
        </>
      );
    }
    default:
      return null;
  }
}

const cardShadow = {
  shadowColor: '#1B1B2A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  title: { ...typography.heading, color: INK, marginBottom: spacing.sm },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.xl },

  verdictCard: { borderRadius: 24, padding: spacing.lg, gap: 6, borderLeftWidth: 5, ...cardShadow },
  verdictEmoji: { fontSize: 28 },
  verdictLabel: { ...typography.title, fontWeight: '800' },
  verdictReason: { ...typography.body, color: INK },

  weekCard: { backgroundColor: CARD, borderRadius: 24, padding: spacing.lg, gap: spacing.md, ...cardShadow },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...typography.title, color: INK, fontWeight: '700' },
  weekCount: { ...typography.label, color: MUTED },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCell: { alignItems: 'center', gap: 6 },
  dot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEEDF4', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: TEAL },
  dotToday: { borderWidth: 2, borderColor: VIOLET },
  dotCheck: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  dayLetter: { ...typography.caption, color: MUTED },
  dayLetterToday: { color: VIOLET, fontWeight: '800' },

  counterRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  counter: { alignItems: 'center', flex: 1, gap: 2 },
  counterValue: { ...typography.heading, fontWeight: '800' },
  counterLabel: { ...typography.caption, color: MUTED, textAlign: 'center' },

  nextCard: { backgroundColor: CARD, borderRadius: 20, padding: spacing.lg, gap: spacing.sm, ...cardShadow },
  nextText: { ...typography.body, color: INK },
  nextStrong: { fontWeight: '800' },
  nextSub: { ...typography.caption, color: MUTED },

  track: { height: 8, borderRadius: 4, backgroundColor: '#EEEDF4', overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: VIOLET },
  trackFillLock: { backgroundColor: LOCK },

  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, marginTop: spacing.xs },

  insightCard: { backgroundColor: CARD, borderRadius: 20, padding: spacing.lg, gap: spacing.sm, ...cardShadow },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  insightIcon: { fontSize: 22 },
  insightTitle: { ...typography.title, color: INK, fontWeight: '700', flex: 1 },
  insightBody: { ...typography.body, color: INK },
  bodyStrong: { fontWeight: '800', color: VIOLET },

  lockedCard: { backgroundColor: '#F4F3F8', shadowOpacity: 0, elevation: 0 },
  lockIcon: { fontSize: 18 },
  lockedTitle: { ...typography.title, color: LOCK, fontWeight: '700', flex: 1 },
  lockBadge: { ...typography.caption, color: LOCK, fontWeight: '800' },
  lockedTeaser: { ...typography.body, color: MUTED },
  lockedHint: { ...typography.caption, color: LOCK },

  fullLink: { alignSelf: 'center', backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.xs },
  fullLinkText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
