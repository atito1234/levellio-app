import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer, ScreenHeader, SectionLabel } from '@/components';
import { HBarChart, HourBars, BarHistogram, type BarDatum, type HistogramBar } from '@/components/charts';
import { radii, shadows, spacing, typography } from '@/theme';
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
import { gapsFor, planProgressOn } from '@/lib/plan';
import { CATEGORY_META, resolveCategory } from '@/lib/categories';
import { dayKey, shiftDayKey, formatDayKey } from '@/lib/dates';
import { rollupForDay } from '@/lib/metrics/rollup';
import { getCapacity, type CapacityId } from '@/lib/compounding';
import { useGame } from '@/state/GameContext';
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

function methodLabel(method: ActivitySessionEvent['method'], translate: TFunction): string {
  return translate(`method.${method}`);
}

function categoryLabel(category: string, translate: TFunction): string {
  return CATEGORY_META[resolveCategory(category)]?.label ?? translate('categoryOther');
}
function categoryIcon(category: string): string {
  return CATEGORY_META[resolveCategory(category)]?.icon ?? '•';
}

/** Top capacities a day's rollup moved (strongest first). */
function topCapacities(rollup: { capacityPoints: Partial<Record<CapacityId, number>> }): { id: CapacityId; name: string; value: number }[] {
  return (Object.entries(rollup.capacityPoints) as [CapacityId, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, value]) => ({ id, name: getCapacity(id).name, value: Math.round(value) }));
}

/** Pretty label for a YYYY-MM-DD key, e.g. "Sun, Jun 14". */
function dayLabel(key: string, locale: string): string {
  return formatDayKey(key, locale);
}

export function InsightsScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation('insights');
  const locale = i18n.language;
  const weekdayNames = t('common:weekdaysAbbr', { returnObjects: true }) as string[];
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
  const { quests } = useGame();
  const [showSessions, setShowSessions] = useState(false);

  // Day-review graphics: what moved your capacities, and the gaps to carry over.
  const dayCaps = useMemo(() => (day ? topCapacities(rollupForDay(scoped, day)) : []), [day, scoped]);
  const dayGaps = useMemo(
    () => (day && dayPlan ? gapsFor(quests, dayPlan, doneIds) : []),
    [day, dayPlan, quests, doneIds],
  );

  const catBars = useMemo<BarDatum[]>(
    () =>
      byCategory(scoped)
        .filter((c) => c.summary.totalMin > 0)
        .map((c, i) => ({
          key: c.category,
          label: categoryLabel(c.category, t),
          icon: categoryIcon(c.category),
          value: c.summary.totalMin,
          display: formatMinutes(c.summary.totalMin),
          tone: i % 2 === 0 ? 'violet' : 'teal',
        })),
    [scoped, t],
  );

  let heading = t('heading.default');
  if (activityId) {
    heading = scoped[scoped.length - 1]?.title ?? t('heading.activity');
  } else if (category) {
    heading = categoryLabel(category, t);
  } else if (day) {
    heading = dayLabel(day, locale);
  }

  const isOverview = !activityId && !category && !day;

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader title={heading} onBack={() => navigation.goBack()} backLabel={t('a11yBack')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>{t('loading')}</Text>
        ) : scoped.length === 0 ? (
          <EmptyState scope={isOverview ? 'overview' : activityId ? 'activity' : category ? 'category' : 'day'} t={t} />
        ) : (
          <>
            <SummaryCard summary={summary} t={t} locale={locale} weekdayNames={weekdayNames} />

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
                  <Text style={styles.rowTitle}>{t('planRing.title')}</Text>
                  <Text style={styles.rowSub}>
                    {t('planRing.sub', { done: planRing.done, total: planRing.total })}
                  </Text>
                </View>
              </View>
            )}
            {day && catBars.length > 0 && (
              <Section label={t('sections.minutesByCategory')}>
                <View style={styles.chartCard}>
                  <BarHistogram
                    bars={catBars.map((b) => ({ label: b.label, value: b.value }))}
                    onPressBar={(_, i) => {
                      const cat = catBars[i]?.key;
                      if (cat) navigation.push('Insights', { category: cat });
                    }}
                  />
                </View>
              </Section>
            )}
            {day && dayCaps.length > 0 && (
              <Section label={t('sections.movedCapacities')}>
                <View style={styles.chipWrap}>
                  {dayCaps.map((c) => (
                    <Pressable
                      key={c.id}
                      style={styles.capChip}
                      onPress={() => navigation.navigate('CapacityFocus', { capacityId: c.id })}
                      accessibilityRole="button"
                      accessibilityLabel={t('cap.a11y', { name: c.name, value: c.value })}
                    >
                      <Text style={styles.capChipText}>
                        {t('cap.label', { name: c.name, value: c.value })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Section>
            )}
            {day && (
              <Section label={t('sections.timeOfDay')}>
                <View style={styles.chartCard}>
                  <HourBars counts={summary.byHour} />
                </View>
              </Section>
            )}
            {day && dayGaps.length > 0 && (
              <Section label={t('sections.gaps')}>
                {dayGaps.slice(0, 6).map((q) => (
                  <Pressable
                    key={q.id}
                    style={styles.row}
                    onPress={() => navigation.navigate('Plan', { day: shiftDayKey(dayKey(new Date()), 1) })}
                    accessibilityRole="button"
                    accessibilityLabel={t('gap.a11y', { title: q.title })}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{q.title}</Text>
                      <Text style={styles.rowSub}>{t('gap.sub')}</Text>
                    </View>
                    <Text style={styles.rowChevron}>›</Text>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Overview: tap a category to drill in. */}
            {isOverview && (
              <Section label={t('sections.byCategory')}>
                {byCategory(scoped).map((c) => (
                  <Pressable
                    key={c.category}
                    onPress={() => navigation.push('Insights', { category: c.category })}
                    accessibilityRole="button"
                    accessibilityLabel={t('row.a11yCategory', { count: c.summary.count, label: categoryLabel(c.category, t) })}
                    style={styles.row}
                  >
                    <Text style={styles.rowIcon}>{categoryIcon(c.category)}</Text>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{categoryLabel(c.category, t)}</Text>
                      <Text style={styles.rowSub}>
                        {t('row.sub', { count: c.summary.count, minutes: formatMinutes(c.summary.totalMin) })}
                        {c.summary.bestHour !== null ? t('row.bestSuffix', { time: hourLabel(c.summary.bestHour, locale) }) : ''}
                      </Text>
                    </View>
                    <Text style={styles.rowChevron}>›</Text>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Category: tap an activity to see its full history. */}
            {category && !activityId && (
              <Section label={t('sections.activities')}>
                {byActivity(scoped).map((a) => (
                  <Pressable
                    key={a.activityId}
                    onPress={() => navigation.push('Insights', { activityId: a.activityId })}
                    accessibilityRole="button"
                    accessibilityLabel={t('row.a11yActivity', { count: a.summary.count, title: a.title })}
                    style={styles.row}
                  >
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{a.title}</Text>
                      <Text style={styles.rowSub}>
                        {t('row.sub', { count: a.summary.count, minutes: formatMinutes(a.summary.totalMin) })}
                        {a.summary.bestHour !== null ? t('row.bestSuffix', { time: hourLabel(a.summary.bestHour, locale) }) : ''}
                      </Text>
                    </View>
                    <Text style={styles.rowChevron}>›</Text>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Recent sessions — graphics lead; for a day the raw list is demoted
                behind a toggle (it "brought no value" up front). */}
            {day ? (
              <View style={styles.section}>
                <Pressable
                  onPress={() => setShowSessions((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showSessions ? t('details.a11yHide') : t('details.a11yShow')}
                >
                  <SectionLabel>{showSessions ? t('details.hide') : t('details.show', { count: scoped.length })}</SectionLabel>
                </Pressable>
                {showSessions && (
                  <View style={styles.sectionBody}>
                    {[...scoped]
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((s) => (
                        <SessionRow key={s.id} session={s} showDay={false} t={t} locale={locale} />
                      ))}
                  </View>
                )}
              </View>
            ) : (
              <Section label={activityId ? t('sections.sessions') : t('sections.recent')}>
                {[...scoped]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .slice(0, activityId ? 60 : 12)
                  .map((s) => (
                    <SessionRow key={s.id} session={s} showDay={!day} t={t} locale={locale} />
                  ))}
              </Section>
            )}

            {/* Close the loop: review a day → plan tomorrow. */}
            {day && (
              <Pressable
                onPress={() => navigation.navigate('Plan', { day: shiftDayKey(dayKey(new Date()), 1) })}
                accessibilityRole="button"
                accessibilityLabel={t('planTomorrow.a11y')}
                style={styles.planTomorrow}
              >
                <Text style={styles.planTomorrowText}>{t('planTomorrow.text')}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function SummaryCard({ summary, t, locale, weekdayNames }: { summary: Summary; t: TFunction; locale: string; weekdayNames: string[] }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.statGrid}>
        <Stat value={`${summary.count}`} label={t('summary.session', { count: summary.count })} />
        <Stat value={formatMinutes(summary.totalMin)} label={t('summary.totalTime')} />
        <Stat value={summary.avgMin !== null ? formatMinutes(summary.avgMin) : '—'} label={t('summary.avgPerSession')} />
      </View>
      {(summary.bestHour !== null || summary.bestWeekday !== null) && (
        <View style={styles.bestRow}>
          {summary.bestHour !== null && (
            <View style={styles.bestPill} accessibilityLabel={t('summary.a11yBestTime', { time: hourLabel(summary.bestHour, locale) })}>
              <Text style={styles.bestPillText}>{t('summary.bestTime', { time: hourLabel(summary.bestHour, locale) })}</Text>
            </View>
          )}
          {summary.bestWeekday !== null && (
            <View style={styles.bestPill} accessibilityLabel={t('summary.a11yBestDay', { day: weekdayLabel(summary.bestWeekday, weekdayNames) })}>
              <Text style={styles.bestPillText}>{t('summary.bestDay', { day: weekdayLabel(summary.bestWeekday, weekdayNames) })}</Text>
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

function SessionRow({ session, showDay, t, locale }: { session: ActivitySessionEvent; showDay: boolean; t: TFunction; locale: string }) {
  const min = Math.round(session.durationSec / 60);
  const method = methodLabel(session.method, t);
  const durLabel = session.durationSec > 0 ? formatMinutes(min) : method;
  const title = session.title ?? t('activityFallback');
  const when = showDay ? `${dayLabel(sessionDay(session), locale)} · ${sessionTimeLabel(session, locale)}` : sessionTimeLabel(session, locale);
  return (
    <View
      style={styles.sessionRow}
      accessibilityLabel={t('session.a11y', {
        title,
        when,
        duration: durLabel,
        method,
        location: session.location ? t('session.a11yLocationSuffix') : '',
      })}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>
          {when} · {method}
          {session.location ? t('session.locationDot') : ''}
        </Text>
      </View>
      <Text style={styles.sessionDur}>{durLabel}</Text>
    </View>
  );
}

function EmptyState({ scope, t }: { scope: 'overview' | 'activity' | 'category' | 'day'; t: TFunction }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>📈</Text>
      <Text style={styles.empty}>{t(`empty.${scope}`)}</Text>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionLabel>{label}</SectionLabel>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },

  summaryCard: {
    backgroundColor: CARD,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
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
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  planRingWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  planRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  planRingPct: { ...typography.label, color: INK, fontWeight: '800' },
  planTomorrow: { alignSelf: 'center', backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  planTomorrowText: { ...typography.label, color: VIOLET, fontWeight: '700' },

  section: { gap: spacing.sm },
  sectionBody: { gap: spacing.sm },

  chartCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  capChip: { backgroundColor: '#D6F7EF', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 8 },
  capChipText: { ...typography.caption, color: '#0A6E5C', fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: CARD,
    borderRadius: radii.lg,
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
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sessionDur: { ...typography.body, color: TEAL, fontWeight: '800' },

  empty: { ...typography.body, color: MUTED, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40 },
});
