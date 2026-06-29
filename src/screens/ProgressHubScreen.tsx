import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ProjectBadge, ScreenContainer, ScreenHeader, SectionLabel } from '@/components';
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
import { radii, shadows, spacing, typography } from '@/theme';
import { useActivityLog } from '@/state/useActivityLog';
import { useAnalyticsRollup } from '@/state/useAnalyticsRollup';
import { usePlan } from '@/state/PlanContext';
import { useGame } from '@/state/GameContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useGoals } from '@/state/GoalContext';
import { useProjects } from '@/state/ProjectsContext';
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

const TAB_KEYS: Tab[] = ['overview', 'goals', 'buckets', 'capacities', 'habits'];

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
  const { t } = useTranslation('progress');
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'overview');
  const { events, ready } = useActivityLog();
  useAnalyticsRollup(events); // keep durable history fresh while viewing
  const { quests, character } = useGame();
  const { getPlan } = usePlan();
  const { levels } = useCapacities();
  const { goals, membershipFor } = useGoals();
  const { projectActivityIds } = useProjects();
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
      directionVerdict(
        {
          daysDone: daysAccomplished(sessions),
          streakDays: character?.streakDays ?? 0,
          activeThisWeek: activeDaysInWindow(sessions, todayKey, 7),
          activePrevWeek: activeDaysInWindow(sessions, shiftDayKey(todayKey, -7), 7),
        },
        t,
      ),
    [sessions, character?.streakDays, todayKey, t],
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
          members: goalHabits(quests, g, membershipFor(g.id), projectActivityIds),
          sessions,
          getPlan,
          range,
          done,
        }),
      ),
    [goals, quests, sessions, getPlan, range, done, membershipFor, projectActivityIds],
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
      }, t),
    [goalStats, bucketStats, habitStats, levels, quests, todayKey, t],
  );

  const goalSeries = useMemo(
    () =>
      goals.map((g) =>
        adherenceTrendSeries({ id: g.id, kind: 'goal', label: g.title, colorId: g.colorId, members: goalHabits(quests, g, membershipFor(g.id), projectActivityIds), sessions, getPlan, range: trendRange, done }),
      ),
    [goals, quests, sessions, getPlan, trendRange, done, membershipFor, projectActivityIds],
  );

  const bucketSeries = useMemo(
    () =>
      buckets.map((b) =>
        adherenceTrendSeries({ id: b.id, kind: 'bucket', label: b.name, colorId: b.colorId, members: quests.filter((q) => assignments[q.id] === b.id), sessions, getPlan, range: trendRange, done }),
      ),
    [buckets, assignments, quests, sessions, getPlan, trendRange, done],
  );

  const overallLabel = t('momentum:trendChart.overallAdherence');
  const overallTrend = useMemo(
    () =>
      adherenceTrendSeries(
        { id: 'all', kind: 'habit', label: overallLabel, members: quests, sessions, getPlan, range: trendRange, done },
        { label: overallLabel },
      ),
    [quests, sessions, getPlan, trendRange, done, overallLabel],
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
    const nodes: MapNode[] = goalHabits(quests, g, membershipFor(g.id), projectActivityIds)
      .slice(0, 8)
      .map((q) => ({ id: q.id, label: q.title, colorId: g.colorId, weight: (adhById.get(q.id) ?? 0) / 100 }));
    return { center: { id: g.id, label: g.title, colorId: g.colorId } as MapNode, nodes };
  }, [goals, quests, habitStats, membershipFor, projectActivityIds]);

  const reviewDay = (day: string) => navigation.navigate('Insights', { day });

  const hasData = sessions.length > 0 || quests.length > 0;

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader title={t('kicker')} onBack={() => navigation.goBack()} backLabel={t('back')} />

      <Segmented tab={tab} onChange={setTab} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>{t('loading')}</Text>
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
              <Section label={t('howConnects')}>
                <View style={styles.cardCenter}>
                  <RelationshipMap center={goalMap.center} nodes={goalMap.nodes} onPressNode={(n) => run({ label: 'Open', kind: 'focus', target: { questId: n.id } })} />
                  <Text style={styles.provenance}>{t('mapProvenance', { label: goalMap.center.label })}</Text>
                </View>
              </Section>
            )}
            <GroupList items={goalStats.map((s, i) => ({ stat: s, series: goalSeries[i]! }))} kind="goal" onRun={run} emptyMsg={t('emptyGoals')} />
          </>
        ) : tab === 'buckets' ? (
          <GroupList items={bucketStats.map((s, i) => ({ stat: s, series: bucketSeries[i]! }))} kind="bucket" onRun={run} emptyMsg={t('emptyBuckets')} />
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
  const { t } = useTranslation('progress');
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segWrap}>
      {TAB_KEYS.map((key) => {
        const active = key === tab;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.seg, active && styles.segActive]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{t(`tabs.${key}`)}</Text>
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
  const { t } = useTranslation('progress');
  const radarAxes = CAPACITIES.map((c) => ({ label: t(`capacities:${c.id}`), value: levels[c.id] ?? 0, id: c.id }));
  const moverRows: RankRow[] = [...movers]
    .filter((s) => s.scheduled > 0)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, 5)
    .map((s) => ({ id: s.id, label: s.label, delta: s.deltaPct }));

  return (
    <>
      <View style={[styles.verdictCard, { backgroundColor: VERDICT_BG[verdict.tone] }]} accessibilityRole="header" accessibilityLabel={t('verdictA11y', { label: verdict.label, reason: verdict.reason })}>
        <Text style={styles.verdictLabel}>{verdict.label}</Text>
        <Text style={styles.verdictReason}>{verdict.reason}</Text>
      </View>

      {focus.length > 0 && (
        <Section label={t('focusNext')}>
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
              <Text style={styles.cta}>{actLabel(rec.action.label, t)} ›</Text>
            </Pressable>
          ))}
        </Section>
      )}

      <Section label={t('capacityBalance')}>
        <View style={styles.cardCenter}>
          <RadarChart axes={radarAxes} onPressAxis={(a) => a.id && onRun({ label: 'Focus', kind: 'focus', target: { capacityId: a.id as CapacityId } })} />
          <Text style={styles.provenance}>{t('radarProvenance')}</Text>
        </View>
      </Section>

      {moverRows.length > 0 && (
        <Section label={t('topMovers')}>
          <View style={styles.card}>
            <RankBars rows={moverRows} onPressRow={(r) => onRun(moverAction(r, movers))} />
          </View>
        </Section>
      )}

      <Section label={t('adherenceTrend')}>
        <View style={styles.card}>
          <TrendChart series={trend} daysOfData={days} />
        </View>
      </Section>

      <Section label={t('whenShowUp')}>
        <View style={styles.card}>
          <CalendarHeatmap points={activityPoints} colorId="violet" onPressDay={(p) => onReviewDay(p.dayKey)} />
          <Text style={styles.provenance}>{t('heatProvenance')}</Text>
        </View>
      </Section>

      <Pressable onPress={onMore} accessibilityRole="button" style={styles.reflect}>
        <Text style={styles.cta}>{t('moreInsights')}</Text>
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
  const { t } = useTranslation('progress');
  const weekFull = t('common:weekdaysFull', { returnObjects: true }) as string[];
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
            {t('doneStat', { done: stat.done, scheduled: stat.scheduled, delta: deltaText(stat.deltaPct, t) })}
            {stat.streak > 0 ? t('streakSuffix', { streak: stat.streak }) : ''}
          </Text>
        </View>
      </View>
      {series.points.length > 1 && (
        <View style={styles.miniTrend}>
          <Sparkline values={series.points.map((p) => p.value / 100)} height={48} color={accent} />
        </View>
      )}
      {stat.gapWeekdays.length > 0 && (
        <Text style={styles.gapNote}>{t('biggestGap', { day: weekFull[stat.gapWeekdays[0]!] ?? '' })}</Text>
      )}
      <Pressable onPress={() => onRun(action)} accessibilityRole="button" style={styles.cardCta}>
        <Text style={styles.cta}>{actLabel(action.label, t)} ›</Text>
      </Pressable>
    </View>
  );
}

// --- Capacities -------------------------------------------------------------

function Capacities({ stats, levels, onRun }: { stats: GroupStat[]; levels: Record<string, number>; onRun: (a: InsightAction) => void }) {
  const { t } = useTranslation('progress');
  const capName = (id: string) => t(`capacities:${id}`);
  const radarAxes = CAPACITIES.map((c) => ({ label: capName(c.id), value: levels[c.id] ?? 0, id: c.id }));
  return (
    <>
      <Section label={t('balance')}>
        <View style={styles.cardCenter}>
          <RadarChart axes={radarAxes} onPressAxis={(a) => a.id && onRun({ label: 'Focus', kind: 'focus', target: { capacityId: a.id as CapacityId } })} />
          <Text style={styles.provenance}>{t('capRadarProvenance')}</Text>
        </View>
      </Section>
      <Section label={t('eachCapacity')}>
        {CAPACITIES.map((c) => {
          const stat = stats.find((s) => s.id === c.id);
          const level = levels[c.id] ?? 0;
          return (
            <Pressable
              key={c.id}
              style={styles.card}
              onPress={() => onRun({ label: 'Focus', kind: 'focus', target: { capacityId: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={t('capLevelA11y', { name: capName(c.id), level })}
            >
              <View style={styles.groupHead}>
                <View style={styles.ringWrap}>
                  <CapacityRing level={level} colorId={c.colorId} size={56} strokeWidth={7} />
                  <View style={styles.ringCenter} pointerEvents="none">
                    <Text style={styles.ringPct}>{level}</Text>
                  </View>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{capName(c.id)}</Text>
                  <Text style={styles.rowSub}>
                    {stat && stat.scheduled > 0 ? t('feeding', { pct: stat.adherencePct }) : t('noFeeding')}
                  </Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </View>
            </Pressable>
          );
        })}
      </Section>
      <Section label={t('measuredMetrics')}>
        <View style={[styles.card, styles.sensorCard]}>
          <Text style={styles.sensorEmoji}>⌚️</Text>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>{t('connectDevice')}</Text>
            <Text style={styles.rowSub}>{t('connectDeviceSub')}</Text>
          </View>
          <Text style={styles.soon}>{t('soon')}</Text>
        </View>
      </Section>
    </>
  );
}

// --- Habits -----------------------------------------------------------------

type HabitFilter = 'all' | 'personal' | 'community';

function Habits({ stats, onRun }: { stats: GroupStat[]; onRun: (a: InsightAction) => void }) {
  const { t } = useTranslation('progress');
  const { projectsForHabit } = useProjects();
  const [filter, setFilter] = useState<HabitFilter>('all');
  if (stats.length === 0) return <EmptyNote msg={t('emptyHabits')} />;

  const community = stats.filter((s) => projectsForHabit(s.id).length > 0);
  const personal = stats.filter((s) => projectsForHabit(s.id).length === 0);

  const row = (s: GroupStat) => {
    const projects = projectsForHabit(s.id);
    const supports = projects.length ? t('supportsSuffix', { projects: projects.map((p) => p.title).join(', ') }) : '';
    return (
      <Pressable
        key={s.id}
        style={styles.habitRow}
        onPress={() => onRun({ label: 'Open', kind: 'focus', target: { questId: s.id } })}
        accessibilityRole="button"
        accessibilityLabel={t('habitRowA11y', { label: s.label, pct: s.adherencePct, done: s.done, scheduled: s.scheduled, supports })}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle} numberOfLines={1}>{s.label}</Text>
          {projects.length > 0 && <ProjectBadge projects={projects} />}
          <Text style={styles.rowSub}>
            {t('habitStat', { done: s.done, scheduled: s.scheduled, delta: deltaText(s.deltaPct, t) })}
            {s.streak > 0 ? t('streakSuffix', { streak: s.streak }) : ''}
          </Text>
        </View>
        {s.weekly.length > 1 && <View style={styles.spark}><Sparkline values={s.weekly.map((v) => v / 100)} height={32} color={TEAL} /></View>}
        <Text style={[styles.pct, { color: s.adherencePct >= 80 ? TEAL : s.adherencePct >= 50 ? VIOLET : MUTED }]}>{s.adherencePct}%</Text>
      </Pressable>
    );
  };

  const FilterChip = ({ value, label }: { value: HabitFilter; label: string }) => {
    const on = filter === value;
    return (
      <Pressable onPress={() => setFilter(value)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.filterChip, on && styles.filterChipOn]}>
        <Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <>
      {community.length > 0 && (
        <View style={styles.filterRow}>
          <FilterChip value="all" label={t('filterAll')} />
          <FilterChip value="personal" label={t('filterPersonal')} />
          <FilterChip value="community" label={t('filterCommunity')} />
        </View>
      )}
      {(filter === 'all' || filter === 'personal') && personal.length > 0 && (
        <Section label={t('myHabits')}>{personal.map(row)}</Section>
      )}
      {(filter === 'all' || filter === 'community') && community.length > 0 && (
        <Section label={t('poweringProjects')}>{community.map(row)}</Section>
      )}
    </>
  );
}

// --- Shared bits ------------------------------------------------------------

function deltaText(delta: number, t: TFunction): string {
  if (delta === 0) return t('steady');
  return delta > 0 ? t('up', { n: delta }) : t('down', { n: Math.abs(delta) });
}

/** Translate the small set of action labels created in this screen. */
function actLabel(label: string, t: TFunction): string {
  if (label === 'Focus') return t('actFocus');
  if (label === 'Open') return t('actOpen');
  return label;
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
      <SectionLabel>{label}</SectionLabel>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function EmptyNote({ msg }: { msg: string }) {
  return <Text style={styles.empty}>{msg}</Text>;
}

function EmptyState() {
  const { t } = useTranslation('progress');
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>📈</Text>
      <Text style={styles.empty}>{t('emptyState')}</Text>
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

  card: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.md },
  cardCenter: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, ...shadows.md },

  focusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#EDE9FE', borderRadius: radii.lg, padding: spacing.md },
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

  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: '#ECECF2' },
  filterChipOn: { backgroundColor: VIOLET },
  filterChipText: { ...typography.caption, color: MUTED, fontWeight: '700' },
  filterChipTextOn: { color: '#FFFFFF' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, ...shadows.sm },
  spark: { width: 72 },
  pct: { ...typography.body, fontWeight: '800', width: 48, textAlign: 'right' },

  sensorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: 0.9 },
  sensorEmoji: { fontSize: 26 },
  soon: { ...typography.caption, color: MUTED, fontWeight: '700', backgroundColor: '#ECECF2', borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },

  empty: { ...typography.body, color: MUTED, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40 },
});
