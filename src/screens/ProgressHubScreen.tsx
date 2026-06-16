import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer } from '@/components';
import {
  CalendarHeatmap,
  RadarChart,
  RankBars,
  RelationshipMap,
  Sparkline,
  TrendChart,
  type MapNode,
  type RankRow,
} from '@/components/charts';
import { spacing, typography } from '@/theme';
import { useActivityLog } from '@/state/useActivityLog';
import { useAnalyticsRollup } from '@/state/useAnalyticsRollup';
import { usePlan } from '@/state/PlanContext';
import { useGame } from '@/state/GameContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { useInsightAction } from '@/hooks/useInsightAction';
import { sessionDay, sessionsOf, weekdayLabel } from '@/lib/analytics';
import { activeDaysInWindow, daysAccomplished, directionVerdict, type Direction } from '@/lib/heroAnalytics';
import { goalHabits } from '@/lib/goal';
import { habitsForCapacity } from '@/lib/plan';
import { dayKey, shiftDayKey } from '@/lib/dates';
import { CATEGORY_META } from '@/lib/categories';
import { CAPACITIES } from '@/lib/compounding';
import {
  adherenceTrendSeries,
  computeStat,
  confidenceLabel,
  distinctSessionDays,
  doneDaysByActivity,
  focusRecommendations,
  habitStat,
  rangeEndingOn,
  rangeKeys,
  type DayRange,
  type GroupStat,
  type InsightAction,
} from '@/lib/metrics';
import type { FocusRec } from '@/lib/metrics/focus';
import type { CapacityId } from '@/lib/compounding';
import type { BucketColorId } from '@/lib/buckets';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;
type Tab = 'overview' | 'goals' | 'buckets' | 'capacities' | 'habits';

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'goals', label: 'Goals' },
  { key: 'buckets', label: 'Buckets' },
  { key: 'capacities', label: 'Capacities' },
  { key: 'habits', label: 'Habits' },
];

const RANGE_DAYS = 28;
const TREND_DAYS = 56;

// Soft tone backgrounds for the momentum verdict (palette-safe, gold reserved).
const VERDICT_BG: Record<Direction['tone'], string> = {
  onTrack: '#D6F7EF',
  building: '#EDE9FE',
  drifting: '#FCE3EE',
  start: '#ECECF2',
};

export function ProgressHubScreen({ route, navigation }: Props) {
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'overview');
  const { events, ready } = useActivityLog();
  useAnalyticsRollup(events); // keep durable history fresh while viewing
  const { quests, character } = useGame();
  const { getPlan } = usePlan();
  const { levels } = useCapacities();
  const { goals } = useGoals();
  const { buckets, assignments } = useBuckets();
  const run = useInsightAction();

  const sessions = useMemo(() => sessionsOf(events), [events]);
  const todayKey = dayKey(new Date());
  const range: DayRange = useMemo(() => rangeEndingOn(todayKey, RANGE_DAYS), [todayKey]);
  const trendRange: DayRange = useMemo(() => rangeEndingOn(todayKey, TREND_DAYS), [todayKey]);
  const done = useMemo(() => doneDaysByActivity(sessions), [sessions]);
  const days = distinctSessionDays(sessions);

  // Honest momentum headline (folded in from the old reflective screen).
  const verdict = useMemo(
    () =>
      directionVerdict({
        daysDone: daysAccomplished(sessions),
        streakDays: character?.streakDays ?? 0,
        activeThisWeek: activeDaysInWindow(sessions, todayKey, 7),
        activePrevWeek: activeDaysInWindow(sessions, shiftDayKey(todayKey, -7), 7),
      }),
    [sessions, character?.streakDays, todayKey],
  );

  const habitStats = useMemo(
    () =>
      quests
        .map((q) => habitStat(q, sessions, getPlan, range, done))
        .filter((s) => s.scheduled > 0)
        .sort((a, b) => b.adherencePct - a.adherencePct),
    [quests, sessions, getPlan, range, done],
  );

  const goalStats = useMemo(
    () =>
      goals.map((g) =>
        computeStat({
          id: g.id,
          kind: 'goal',
          label: g.title,
          colorId: g.colorId,
          members: goalHabits(quests, g),
          sessions,
          getPlan,
          range,
          done,
        }),
      ),
    [goals, quests, sessions, getPlan, range, done],
  );

  const bucketStats = useMemo(
    () =>
      buckets.map((b) =>
        computeStat({
          id: b.id,
          kind: 'bucket',
          label: b.name,
          colorId: b.colorId,
          members: quests.filter((q) => assignments[q.id] === b.id),
          sessions,
          getPlan,
          range,
          done,
        }),
      ),
    [buckets, assignments, quests, sessions, getPlan, range, done],
  );

  const capacityStats = useMemo(
    () =>
      CAPACITIES.map((c) =>
        computeStat({
          id: c.id,
          kind: 'capacity',
          label: c.name,
          members: habitsForCapacity(quests, c.id),
          sessions,
          getPlan,
          range,
          done,
        }),
      ),
    [quests, sessions, getPlan, range, done],
  );

  const focus = useMemo(
    () =>
      focusRecommendations({
        stats: [...goalStats, ...bucketStats, ...habitStats],
        levels,
        quests,
        todayKey,
      }),
    [goalStats, bucketStats, habitStats, levels, quests, todayKey],
  );

  const goalSeries = useMemo(
    () =>
      goals.map((g) =>
        adherenceTrendSeries({ id: g.id, kind: 'goal', label: g.title, colorId: g.colorId, members: goalHabits(quests, g), sessions, getPlan, range: trendRange, done }),
      ),
    [goals, quests, sessions, getPlan, trendRange, done],
  );

  const bucketSeries = useMemo(
    () =>
      buckets.map((b) =>
        adherenceTrendSeries({ id: b.id, kind: 'bucket', label: b.name, colorId: b.colorId, members: quests.filter((q) => assignments[q.id] === b.id), sessions, getPlan, range: trendRange, done }),
      ),
    [buckets, assignments, quests, sessions, getPlan, trendRange, done],
  );

  const overallTrend = useMemo(
    () =>
      adherenceTrendSeries(
        { id: 'all', kind: 'habit', label: 'Overall adherence', members: quests, sessions, getPlan, range: trendRange, done },
        { label: 'Overall adherence' },
      ),
    [quests, sessions, getPlan, trendRange, done],
  );

  // Daily activity (sessions per day) over the trend window → heatmap.
  const activityPoints = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const s of sessions) perDay.set(sessionDay(s), (perDay.get(sessionDay(s)) ?? 0) + 1);
    return rangeKeys(trendRange).map((d) => ({ dayKey: d, value: perDay.get(d) ?? 0 }));
  }, [sessions, trendRange]);

  // Mind-map for the first goal: goal ↔ its contributing habits (sized by adherence).
  const goalMap = useMemo(() => {
    const g = goals[0];
    if (!g) return null;
    const adhById = new Map(habitStats.map((s) => [s.id, s.adherencePct]));
    const nodes: MapNode[] = goalHabits(quests, g)
      .slice(0, 8)
      .map((q) => ({ id: q.id, label: q.title, colorId: g.colorId, weight: (adhById.get(q.id) ?? 0) / 100 }));
    return { center: { id: g.id, label: g.title, colorId: g.colorId } as MapNode, nodes };
  }, [goals, quests, habitStats]);

  const reviewDay = (day: string) => navigation.navigate('Insights', { day });

  const hasData = sessions.length > 0 || quests.length > 0;

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>YOUR PROGRESS</Text>
        <View style={styles.chevronSpacer} />
      </View>

      <Segmented tab={tab} onChange={setTab} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>Loading your progress…</Text>
        ) : !hasData ? (
          <EmptyState />
        ) : tab === 'overview' ? (
          <Overview
            verdict={verdict}
            focus={focus}
            levels={levels}
            movers={[...goalStats, ...bucketStats]}
            trend={overallTrend}
            days={days}
            activityPoints={activityPoints}
            onReviewDay={reviewDay}
            onMore={() => navigation.navigate('Analytics')}
            onRun={run}
          />
        ) : tab === 'goals' ? (
          <>
            {goalMap && goalMap.nodes.length > 0 && (
              <Section label="HOW IT CONNECTS">
                <View style={styles.cardCenter}>
                  <RelationshipMap center={goalMap.center} nodes={goalMap.nodes} onPressNode={(n) => run({ label: 'Open', kind: 'focus', target: { questId: n.id } })} />
                  <Text style={styles.provenance}>{goalMap.center.label} ← its habits · tap a habit to open it</Text>
                </View>
              </Section>
            )}
            <GroupList items={goalStats.map((s, i) => ({ stat: s, series: goalSeries[i]! }))} kind="goal" onRun={run} emptyMsg="No goals yet. Create one to ladder your habits up to a why." />
          </>
        ) : tab === 'buckets' ? (
          <GroupList items={bucketStats.map((s, i) => ({ stat: s, series: bucketSeries[i]! }))} kind="bucket" onRun={run} emptyMsg="No buckets yet. Organize habits into buckets to track them here." />
        ) : tab === 'capacities' ? (
          <Capacities stats={capacityStats} levels={levels} onRun={run} />
        ) : (
          <Habits stats={habitStats} onRun={run} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Segmented({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segWrap}>
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.seg, active && styles.segActive]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// --- Overview ---------------------------------------------------------------

function Overview({
  verdict,
  focus,
  levels,
  movers,
  trend,
  days,
  activityPoints,
  onReviewDay,
  onMore,
  onRun,
}: {
  verdict: Direction;
  focus: FocusRec[];
  levels: Record<string, number>;
  movers: GroupStat[];
  trend: ReturnType<typeof adherenceTrendSeries>;
  days: number;
  activityPoints: { dayKey: string; value: number }[];
  onReviewDay: (day: string) => void;
  onMore: () => void;
  onRun: (a: InsightAction) => void;
}) {
  const radarAxes = CAPACITIES.map((c) => ({ label: c.name, value: levels[c.id] ?? 0, id: c.id }));
  const moverRows: RankRow[] = [...movers]
    .filter((s) => s.scheduled > 0)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, 5)
    .map((s) => ({ id: s.id, label: s.label, delta: s.deltaPct }));

  return (
    <>
      <View style={[styles.verdictCard, { backgroundColor: VERDICT_BG[verdict.tone] }]} accessibilityRole="header" accessibilityLabel={`${verdict.label}. ${verdict.reason}`}>
        <Text style={styles.verdictLabel}>{verdict.label}</Text>
        <Text style={styles.verdictReason}>{verdict.reason}</Text>
      </View>

      {focus.length > 0 && (
        <Section label="FOCUS NEXT">
          {focus.map((rec) => (
            <Pressable
              key={rec.id}
              style={styles.focusCard}
              onPress={() => onRun(rec.action)}
              accessibilityRole="button"
              accessibilityLabel={`${rec.title}. ${rec.reason}. ${rec.action.label}`}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{rec.title}</Text>
                <Text style={styles.rowSub}>{rec.reason}</Text>
              </View>
              <Text style={styles.cta}>{rec.action.label} ›</Text>
            </Pressable>
          ))}
        </Section>
      )}

      <Section label="CAPACITY BALANCE">
        <View style={styles.cardCenter}>
          <RadarChart axes={radarAxes} onPressAxis={(a) => a.id && onRun({ label: 'Focus', kind: 'focus', target: { capacityId: a.id as CapacityId } })} />
          <Text style={styles.provenance}>Modeled from your habits · tap an axis to dig in</Text>
        </View>
      </Section>

      {moverRows.length > 0 && (
        <Section label="TOP MOVERS · WEEK OVER WEEK">
          <View style={styles.card}>
            <RankBars rows={moverRows} onPressRow={(r) => onRun(moverAction(r, movers))} />
          </View>
        </Section>
      )}

      <Section label="ADHERENCE TREND">
        <View style={styles.card}>
          <TrendChart series={trend} daysOfData={days} />
        </View>
      </Section>

      <Section label="WHEN YOU SHOW UP">
        <View style={styles.card}>
          <CalendarHeatmap points={activityPoints} colorId="violet" onPressDay={(p) => onReviewDay(p.dayKey)} />
          <Text style={styles.provenance}>Each cell is a day · tap one to review it</Text>
        </View>
      </Section>

      <Pressable onPress={onMore} accessibilityRole="button" style={styles.reflect}>
        <Text style={styles.cta}>🧭 More insights · ratings, rhythm & science ›</Text>
      </Pressable>
    </>
  );
}

function moverAction(row: RankRow, movers: GroupStat[]): InsightAction {
  const m = movers.find((s) => s.id === row.id);
  if (m?.kind === 'goal') return { label: 'Focus', kind: 'focus', target: { goalId: m.id } };
  return { label: 'Focus', kind: 'focus', target: { bucketId: row.id } };
}

// --- Goals / Buckets --------------------------------------------------------

interface GroupItem {
  stat: GroupStat;
  series: ReturnType<typeof adherenceTrendSeries>;
}

function GroupList({
  items,
  kind,
  onRun,
  emptyMsg,
}: {
  items: GroupItem[];
  kind: 'goal' | 'bucket';
  onRun: (a: InsightAction) => void;
  emptyMsg: string;
}) {
  if (items.length === 0) return <EmptyNote msg={emptyMsg} />;
  return (
    <>
      {items.map(({ stat: s, series }) => {
        const action: InsightAction =
          kind === 'goal' ? { label: 'Focus', kind: 'focus', target: { goalId: s.id } } : { label: 'Open', kind: 'focus', target: { bucketId: s.id } };
        return <GroupCard key={s.id} stat={s} series={series} onRun={onRun} action={action} />;
      })}
    </>
  );
}

function GroupCard({ stat, series, onRun, action }: { stat: GroupStat; series: ReturnType<typeof adherenceTrendSeries>; onRun: (a: InsightAction) => void; action: InsightAction }) {
  const accent = colorOf(stat.colorId);
  return (
    <View style={styles.card}>
      <View style={styles.groupHead}>
        <View style={styles.ringWrap}>
          <CapacityRing level={stat.adherencePct} colorId={ringColorId(stat.colorId)} size={56} strokeWidth={7} />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={styles.ringPct}>{stat.adherencePct}%</Text>
          </View>
        </View>
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{stat.label}</Text>
          <Text style={styles.rowSub}>
            {stat.done}/{stat.scheduled} done · {deltaText(stat.deltaPct)}
            {stat.streak > 0 ? ` · 🔥 ${stat.streak}` : ''}
          </Text>
        </View>
      </View>
      {series.points.length > 1 && (
        <View style={styles.miniTrend}>
          <Sparkline values={series.points.map((p) => p.value / 100)} height={48} color={accent} />
        </View>
      )}
      {stat.gapWeekdays.length > 0 && (
        <Text style={styles.gapNote}>Biggest gap: {weekdayLabel(stat.gapWeekdays[0]!)}s</Text>
      )}
      <Pressable onPress={() => onRun(action)} accessibilityRole="button" style={styles.cardCta}>
        <Text style={styles.cta}>{action.label} ›</Text>
      </Pressable>
    </View>
  );
}

// --- Capacities -------------------------------------------------------------

function Capacities({ stats, levels, onRun }: { stats: GroupStat[]; levels: Record<string, number>; onRun: (a: InsightAction) => void }) {
  const radarAxes = CAPACITIES.map((c) => ({ label: c.name, value: levels[c.id] ?? 0, id: c.id }));
  return (
    <>
      <Section label="BALANCE">
        <View style={styles.cardCenter}>
          <RadarChart axes={radarAxes} onPressAxis={(a) => a.id && onRun({ label: 'Focus', kind: 'focus', target: { capacityId: a.id as CapacityId } })} />
          <Text style={styles.provenance}>Modeled from your habits (derived) · sensors coming soon</Text>
        </View>
      </Section>
      <Section label="EACH CAPACITY">
        {CAPACITIES.map((c) => {
          const stat = stats.find((s) => s.id === c.id);
          const level = levels[c.id] ?? 0;
          return (
            <Pressable
              key={c.id}
              style={styles.card}
              onPress={() => onRun({ label: 'Focus', kind: 'focus', target: { capacityId: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, level ${level}%. See what feeds it`}
            >
              <View style={styles.groupHead}>
                <View style={styles.ringWrap}>
                  <CapacityRing level={level} colorId={c.colorId} size={56} strokeWidth={7} />
                  <View style={styles.ringCenter} pointerEvents="none">
                    <Text style={styles.ringPct}>{level}</Text>
                  </View>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowSub}>
                    {stat && stat.scheduled > 0 ? `Feeding habits ${stat.adherencePct}% on track` : 'No habits feeding this yet'}
                  </Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </View>
            </Pressable>
          );
        })}
      </Section>
      <Section label="MEASURED METRICS">
        <View style={[styles.card, styles.sensorCard]}>
          <Text style={styles.sensorEmoji}>⌚️</Text>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Connect a device</Text>
            <Text style={styles.rowSub}>Sleep, heart rate & steps will appear here as measured metrics.</Text>
          </View>
          <Text style={styles.soon}>Soon</Text>
        </View>
      </Section>
    </>
  );
}

// --- Habits -----------------------------------------------------------------

function Habits({ stats, onRun }: { stats: GroupStat[]; onRun: (a: InsightAction) => void }) {
  if (stats.length === 0) return <EmptyNote msg="No scheduled habits yet. Add a recurrence or plan a habit to track adherence." />;
  return (
    <Section label="RANKED BY ADHERENCE">
      {stats.map((s) => (
        <Pressable
          key={s.id}
          style={styles.habitRow}
          onPress={() => onRun({ label: 'Open', kind: 'focus', target: { questId: s.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${s.label}, ${s.adherencePct}% adherence, ${s.done} of ${s.scheduled} done`}
        >
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle} numberOfLines={1}>{s.label}</Text>
            <Text style={styles.rowSub}>
              {s.done}/{s.scheduled} · {deltaText(s.deltaPct)}
              {s.streak > 0 ? ` · 🔥 ${s.streak}` : ''}
            </Text>
          </View>
          {s.weekly.length > 1 && <View style={styles.spark}><Sparkline values={s.weekly.map((v) => v / 100)} height={32} color={TEAL} /></View>}
          <Text style={[styles.pct, { color: s.adherencePct >= 80 ? TEAL : s.adherencePct >= 50 ? VIOLET : MUTED }]}>{s.adherencePct}%</Text>
        </Pressable>
      ))}
    </Section>
  );
}

// --- Shared bits ------------------------------------------------------------

function deltaText(delta: number): string {
  if (delta === 0) return 'steady';
  return delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`;
}

function colorOf(colorId?: BucketColorId): string {
  return colorId === 'teal' ? TEAL : VIOLET;
}

/** Map any bucket/goal palette colour to a CapacityRing-supported hue. */
function ringColorId(colorId?: BucketColorId): 'violet' | 'teal' {
  return colorId === 'teal' || colorId === 'lime' || colorId === 'sky' ? 'teal' : 'violet';
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function EmptyNote({ msg }: { msg: string }) {
  return <Text style={styles.empty}>{msg}</Text>;
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>📈</Text>
      <Text style={styles.empty}>Complete a few habits and your progress — adherence, balance, and what to do next — shows up here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md },

  segWrap: { gap: spacing.sm, paddingVertical: spacing.sm },
  seg: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999, backgroundColor: '#ECECF2' },
  segActive: { backgroundColor: VIOLET },
  segText: { ...typography.caption, color: MUTED, fontWeight: '700' },
  segTextActive: { color: '#FFFFFF' },

  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  sectionBody: { gap: spacing.sm },

  card: { backgroundColor: CARD, borderRadius: 24, padding: spacing.lg, gap: spacing.sm, shadowColor: '#1B1B2A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  cardCenter: { backgroundColor: CARD, borderRadius: 24, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, shadowColor: '#1B1B2A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },

  focusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#EDE9FE', borderRadius: 18, padding: spacing.md },
  cta: { ...typography.label, color: VIOLET, fontWeight: '800' },

  verdictCard: { borderRadius: 24, padding: spacing.lg, gap: 4 },
  verdictLabel: { ...typography.title, color: INK },
  verdictReason: { ...typography.caption, color: MUTED },
  reflect: { alignSelf: 'center', backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  cardCta: { alignSelf: 'flex-start' },
  provenance: { ...typography.caption, color: MUTED, textAlign: 'center' },

  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ringWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringPct: { ...typography.caption, color: INK, fontWeight: '800' },
  miniTrend: { marginTop: spacing.xs },
  gapNote: { ...typography.caption, color: MUTED },

  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '700' },
  rowSub: { ...typography.caption, color: MUTED },
  rowChevron: { fontSize: 24, color: MUTED },

  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 18, padding: spacing.md },
  spark: { width: 72 },
  pct: { ...typography.body, fontWeight: '800', width: 48, textAlign: 'right' },

  sensorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: 0.9 },
  sensorEmoji: { fontSize: 26 },
  soon: { ...typography.caption, color: MUTED, fontWeight: '700', backgroundColor: '#ECECF2', borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },

  empty: { ...typography.body, color: MUTED, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40 },
});
