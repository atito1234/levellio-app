import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer } from '@/components';
import { HBarChart, HourBars, type BarDatum } from '@/components/charts';
import { spacing, typography } from '@/theme';
import { useActivityLog } from '@/state/useActivityLog';
import { usePlan } from '@/state/PlanContext';
import {
  byActivity,
  byCategory,
  completedActivityIds,
  formatMinutes,
  hourLabel,
  sessionDay,
  sessionsForDay,
  sessionsOf,
  sessionTimeLabel,
  summarize,
  weekdayLabel,
  type Summary,
} from '@/lib/analytics';
import { planProgressOn } from '@/lib/plan';
import { CATEGORY_META, resolveCategory } from '@/lib/categories';
import { dayKey, shiftDayKey } from '@/lib/dates';
import type { ActivitySessionEvent } from '@/lib/metadata';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

// Locked palette (gold stays reserved for 100% rings — never used here).
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';

const METHOD_LABEL: Record<ActivitySessionEvent['method'], string> = {
  timer: 'Timer',
  pomodoro: 'Focus',
  manual: 'Logged',
};

function categoryLabel(category: string): string {
  return CATEGORY_META[resolveCategory(category)]?.label ?? 'Other';
}
function categoryIcon(category: string): string {
  return CATEGORY_META[resolveCategory(category)]?.icon ?? '•';
}

/** Pretty label for a YYYY-MM-DD key, e.g. "Sun, Jun 14". */
function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function InsightsScreen({ route, navigation }: Props) {
  const { events, ready } = useActivityLog();
  const activityId = route.params?.activityId;
  const category = route.params?.category;
  const day = route.params?.day;

  const allSessions = useMemo(() => sessionsOf(events), [events]);

  // Scope the data: activity > category > day > overview.
  const scoped = useMemo(() => {
    if (activityId) return allSessions.filter((s) => s.activityId === activityId);
    if (category) return allSessions.filter((s) => resolveCategory(s.category ?? '') === resolveCategory(category));
    if (day) return sessionsForDay(allSessions, day);
    return allSessions;
  }, [allSessions, activityId, category, day]);

  const summary = useMemo(() => summarize(scoped), [scoped]);

  // Day-scope chart data (plan-vs-done + minutes-by-category). Honest: the ring
  // only shows when that day actually had a plan.
  const { getPlan } = usePlan();
  const dayPlan = day ? getPlan(day) : undefined;
  const doneIds = useMemo(() => completedActivityIds(scoped), [scoped]);
  const planRing = day && dayPlan ? planProgressOn(dayPlan, doneIds) : null;
  const catBars = useMemo<BarDatum[]>(
    () =>
      byCategory(scoped)
        .filter((c) => c.summary.totalMin > 0)
        .map((c, i) => ({
          key: c.category,
          label: categoryLabel(c.category),
          icon: categoryIcon(c.category),
          value: c.summary.totalMin,
          display: formatMinutes(c.summary.totalMin),
          tone: i % 2 === 0 ? 'violet' : 'teal',
        })),
    [scoped],
  );

  let heading = 'Insights';
  let kicker = 'WHAT’S WORKING';
  if (activityId) {
    heading = scoped[scoped.length - 1]?.title ?? 'Activity';
    kicker = 'ACTIVITY HISTORY';
  } else if (category) {
    heading = categoryLabel(category);
    kicker = 'CATEGORY';
  } else if (day) {
    heading = dayLabel(day);
    kicker = 'THIS DAY';
  }

  const isOverview = !activityId && !category && !day;

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>{kicker}</Text>
        <View style={styles.chevronSpacer} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {heading}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>Loading your activity…</Text>
        ) : scoped.length === 0 ? (
          <EmptyState scope={isOverview ? 'overview' : activityId ? 'activity' : category ? 'category' : 'day'} />
        ) : (
          <>
            <SummaryCard summary={summary} />

            {/* Day review: plan-vs-done, minutes by category, and time of day. */}
            {day && planRing && (
              <View style={styles.planRingCard}>
                <View style={styles.planRingWrap}>
                  <CapacityRing level={planRing.pct} colorId="violet" size={72} strokeWidth={8} />
                  <View style={styles.planRingCenter} pointerEvents="none">
                    <Text style={styles.planRingPct}>{planRing.pct}%</Text>
                  </View>
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>Plan vs done</Text>
                  <Text style={styles.rowSub}>
                    {planRing.done} of {planRing.total} planned habits done
                  </Text>
                </View>
              </View>
            )}
            {day && catBars.length > 0 && (
              <Section label="MINUTES BY CATEGORY">
                <HBarChart data={catBars} />
              </Section>
            )}
            {day && (
              <Section label="TIME OF DAY">
                <HourBars counts={summary.byHour} />
              </Section>
            )}

            {/* Overview: tap a category to drill in. */}
            {isOverview && (
              <Section label="BY CATEGORY">
                {byCategory(scoped).map((c) => (
                  <Pressable
                    key={c.category}
                    onPress={() => navigation.push('Insights', { category: c.category })}
                    accessibilityRole="button"
                    accessibilityLabel={`${categoryLabel(c.category)}, ${c.summary.count} ${c.summary.count === 1 ? 'session' : 'sessions'}. See details`}
                    style={styles.row}
                  >
                    <Text style={styles.rowIcon}>{categoryIcon(c.category)}</Text>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{categoryLabel(c.category)}</Text>
                      <Text style={styles.rowSub}>
                        {c.summary.count} {c.summary.count === 1 ? 'session' : 'sessions'} · {formatMinutes(c.summary.totalMin)}
                        {c.summary.bestHour !== null ? ` · best ${hourLabel(c.summary.bestHour)}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.rowChevron}>›</Text>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Category: tap an activity to see its full history. */}
            {category && !activityId && (
              <Section label="ACTIVITIES">
                {byActivity(scoped).map((a) => (
                  <Pressable
                    key={a.activityId}
                    onPress={() => navigation.push('Insights', { activityId: a.activityId })}
                    accessibilityRole="button"
                    accessibilityLabel={`${a.title}, ${a.summary.count} ${a.summary.count === 1 ? 'session' : 'sessions'}. See history`}
                    style={styles.row}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                      <Text style={styles.rowSub}>
                        {a.summary.count} {a.summary.count === 1 ? 'session' : 'sessions'} · {formatMinutes(a.summary.totalMin)}
                        {a.summary.bestHour !== null ? ` · best ${hourLabel(a.summary.bestHour)}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.rowChevron}>›</Text>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Recent sessions list (newest first). */}
            <Section label={activityId || day ? 'SESSIONS' : 'RECENT'}>
              {[...scoped]
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, activityId || day ? 60 : 12)
                .map((s) => (
                  <SessionRow key={s.id} session={s} showDay={!day} />
                ))}
            </Section>

            {/* Close the loop: review a day → plan tomorrow. */}
            {day && (
              <Pressable
                onPress={() => navigation.navigate('Plan', { day: shiftDayKey(dayKey(new Date()), 1) })}
                accessibilityRole="button"
                accessibilityLabel="Plan tomorrow"
                style={styles.planTomorrow}
              >
                <Text style={styles.planTomorrowText}>🗓 Plan tomorrow ›</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function SummaryCard({ summary }: { summary: Summary }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.statGrid}>
        <Stat value={`${summary.count}`} label={summary.count === 1 ? 'session' : 'sessions'} />
        <Stat value={formatMinutes(summary.totalMin)} label="total time" />
        <Stat value={summary.avgMin !== null ? formatMinutes(summary.avgMin) : '—'} label="avg / session" />
      </View>
      {(summary.bestHour !== null || summary.bestWeekday !== null) && (
        <View style={styles.bestRow}>
          {summary.bestHour !== null && (
            <View style={styles.bestPill} accessibilityLabel={`Most active around ${hourLabel(summary.bestHour)}`}>
              <Text style={styles.bestPillText}>⏰ Best time · {hourLabel(summary.bestHour)}</Text>
            </View>
          )}
          {summary.bestWeekday !== null && (
            <View style={styles.bestPill} accessibilityLabel={`Most active on ${weekdayLabel(summary.bestWeekday)}`}>
              <Text style={styles.bestPillText}>📅 Best day · {weekdayLabel(summary.bestWeekday)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SessionRow({ session, showDay }: { session: ActivitySessionEvent; showDay: boolean }) {
  const min = Math.round(session.durationSec / 60);
  const durLabel = session.durationSec > 0 ? formatMinutes(min) : METHOD_LABEL[session.method];
  const when = showDay ? `${dayLabel(sessionDay(session))} · ${sessionTimeLabel(session)}` : sessionTimeLabel(session);
  return (
    <View
      style={styles.sessionRow}
      accessibilityLabel={`${session.title ?? 'Activity'}, ${when}, ${durLabel}, ${METHOD_LABEL[session.method]}${session.location ? ', location captured' : ''}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{session.title ?? 'Activity'}</Text>
        <Text style={styles.rowSub}>
          {when} · {METHOD_LABEL[session.method]}
          {session.location ? ' · 📍' : ''}
        </Text>
      </View>
      <Text style={styles.sessionDur}>{durLabel}</Text>
    </View>
  );
}

function EmptyState({ scope }: { scope: 'overview' | 'activity' | 'category' | 'day' }) {
  const msg =
    scope === 'day'
      ? 'No activities completed on this day yet.'
      : scope === 'activity'
        ? 'No sessions logged for this activity yet. Complete it once to start building its history.'
        : scope === 'category'
          ? 'No sessions in this category yet.'
          : 'Complete a few activities and your patterns will show up here — your best times, days, and what’s working.';
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>📈</Text>
      <Text style={styles.empty}>{msg}</Text>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  title: { ...typography.heading, color: INK, marginBottom: spacing.sm },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },

  summaryCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  statGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { ...typography.heading, color: INK, fontWeight: '800' },
  statLabel: { ...typography.caption, color: MUTED },
  bestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  bestPill: { backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  bestPillText: { ...typography.caption, color: VIOLET, fontWeight: '700' },

  planRingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  planRingWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  planRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  planRingPct: { ...typography.label, color: INK, fontWeight: '800' },
  planTomorrow: { alignSelf: 'center', backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  planTomorrowText: { ...typography.label, color: VIOLET, fontWeight: '700' },

  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  sectionBody: { gap: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: spacing.md,
  },
  rowIcon: { fontSize: 22 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '700' },
  rowSub: { ...typography.caption, color: MUTED },
  rowChevron: { fontSize: 24, color: MUTED },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sessionDur: { ...typography.body, color: TEAL, fontWeight: '800' },

  empty: { ...typography.body, color: MUTED, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40 },
});
