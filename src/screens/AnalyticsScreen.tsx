import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader, SectionLabel, StatTile } from '@/components';
import { DotGrid, Sparkline } from '@/components/charts';
import { A, radii, shadows, spacing, typography, STATUS_COLOR, VERDICT_TONE } from '@/theme';
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
  ratingStats,
  tierTitle,
  weekCells,
  INSIGHT_TIERS,
  type InsightTier,
} from '@/lib/heroAnalytics';
import { useEntitlements } from '@/state/SubscriptionContext';
import { canUseAdvancedInsights } from '@/services/monetization';
import { confidenceLabel } from '@/lib/metrics/confidence';
import { activityDayCells, activityJourney, automaticityCurve, JOURNEY_MARKERS } from '@/lib/journey';
import { CATEGORY_META, resolveCategory } from '@/lib/categories';
import { RING_SCIENCE } from '@/data/ringScience';
import { dayKey, shiftDayKey } from '@/lib/dates';
import type { ActivitySessionEvent } from '@/lib/metadata';
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
  ratings: ReturnType<typeof ratingStats>;
}

// Shared analytics palette (single source of truth in src/theme/analytics.ts).
const { ink: INK, muted: MUTED, card: CARD, bg: BG, violet: VIOLET, violetSoft: VIOLET_SOFT, teal: TEAL, lock: LOCK } = A;

const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function AnalyticsScreen({ navigation }: Props) {
  // 'momentum' holds the verdict copy that directionVerdict() resolves.
  const { t, i18n } = useTranslation(['analytics', 'momentum']);
  const locale = i18n.language;
  const weekdayNames = t('common:weekdaysAbbr', { returnObjects: true }) as string[];
  const { character } = useGame();
  const { goals } = useGoals();
  const { events, ready } = useActivityLog();
  const entitlements = useEntitlements();
  const advancedInsights = canUseAdvancedInsights(entitlements);

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
      ratings: ratingStats(sessions),
    };
  }, [events, character?.streakDays]);

  const direction = directionVerdict(
    {
      daysDone: data.daysDone,
      streakDays: data.streakDays,
      activeThisWeek: data.activeThisWeek,
      activePrevWeek: data.activePrevWeek,
    },
    t,
  );
  const tone = VERDICT_TONE[direction.tone];
  const closedThisWeek = data.cells.filter((c) => c.done).length;

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader title={t('title')} onBack={() => navigation.goBack()} backLabel={t('a11yBack')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>{t('loading')}</Text>
        ) : (
          <>
            {/* The 3-second reflection. */}
            <View style={[styles.verdictCard, { backgroundColor: tone.soft, borderColor: tone.accent }]}>
              <Text style={styles.verdictEmoji}>{tone.emoji}</Text>
              <Text style={[styles.verdictLabel, { color: tone.accent }]}>{direction.label}</Text>
              <Text style={styles.verdictReason}>{direction.reason}</Text>
            </View>

            {/* Plus: a forward-looking forecast (additive — free insights unchanged). */}
            <ForecastCard data={data} entitled={advancedInsights} onUnlock={() => navigation.navigate('Paywall')} t={t} />

            {/* This week + the headline counters. */}
            <View style={styles.weekCard}>
              <View style={styles.weekHead}>
                <Text style={styles.cardTitle}>{t('week.title')}</Text>
                <Text style={styles.weekCount}>{t('week.count', { done: closedThisWeek })}</Text>
              </View>
              <View style={styles.weekRow}>
                {data.cells.map((c) => (
                  <View key={c.key} style={styles.weekCell}>
                    <View
                      style={[styles.dot, c.done && styles.dotDone, c.isToday && styles.dotToday]}
                      accessibilityLabel={c.done ? t('week.a11yActive', { day: weekdayLabel(c.weekday, weekdayNames) }) : t('week.a11yRest', { day: weekdayLabel(c.weekday, weekdayNames) })}
                    >
                      {c.done && <Text style={styles.dotCheck}>✓</Text>}
                    </View>
                    <Text style={[styles.dayLetter, c.isToday && styles.dayLetterToday]}>{WEEKDAY_LETTER[c.weekday]}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.counterRow}>
                <StatTile value={`${data.daysDone}`} label={t('counter.daysAccomplished')} />
                <StatTile value={`${data.streakDays}`} label={t('counter.dayStreak')} tint={TEAL} />
                <StatTile value={`${data.activities.length}`} label={t('counter.activities')} tint={VIOLET} />
              </View>
            </View>

            {/* How it feels — self-reported ratings, when any exist. */}
            {data.ratings && (
              <View style={styles.feelCard}>
                <View style={styles.insightHead}>
                  <Text style={styles.insightIcon}>⭐</Text>
                  <Text style={styles.insightTitle}>{t('feel.title')}</Text>
                  <Text style={styles.feelAvg}>{t('feel.average', { value: data.ratings.average.toFixed(1) })}</Text>
                </View>
                <Text style={styles.insightBody}>
                  {t('feel.body', {
                    count: data.ratings.count,
                    word: feelWord(data.ratings.average, t),
                    trend:
                      Math.abs(data.ratings.trend) >= 0.3
                        ? data.ratings.trend > 0
                          ? t('feel.trendUp')
                          : t('feel.trendDown')
                        : t('feel.trendFlat'),
                    best: data.ratings.best ? t('feel.best', { title: data.ratings.best.title }) : '',
                  })}
                </Text>
              </View>
            )}

            {/* No more locks — every insight shows now; we just say how much to
                trust it based on how many days of data back it. */}
            <View style={styles.nextCard}>
              <Text style={styles.nextText}>
                📈 <Text style={styles.nextStrong}>{confidenceLabel(data.daysDone, t)}</Text>
              </Text>
              <Text style={styles.nextSub}>
                {t('confidence.sub', { days: data.daysDone })}
              </Text>
            </View>

            {/* All insights, ungated (thin data is labelled "early"). */}
            <SectionLabel>{t('sections.data')}</SectionLabel>
            {INSIGHT_TIERS.map((tier) => (
              <InsightCard key={tier.id} tier={tier} data={data} goals={goals} t={t} locale={locale} weekdayNames={weekdayNames} />
            ))}

            {/* From repetition to habit — real per-activity journeys. */}
            {data.activities.length > 0 && (
              <>
                <SectionLabel>{t('sections.repetition')}</SectionLabel>
                {data.activities.slice(0, 5).map((a) => (
                  <JourneyRow
                    key={a.activityId}
                    sessions={data.sessions}
                    today={data.today}
                    activityId={a.activityId}
                    title={a.title}
                    onPress={() => navigation.navigate('ActivityJourney', { activityId: a.activityId })}
                    t={t}
                  />
                ))}
              </>
            )}

            {/* Why the ring works — the science, honestly. */}
            <SectionLabel>{t('sections.ring')}</SectionLabel>
            {RING_SCIENCE.map((c) => (
              <View key={c.id} style={styles.scienceCard}>
                <View style={styles.insightHead}>
                  <Text style={styles.insightIcon}>{c.icon}</Text>
                  <Text style={styles.scienceTag}>{c.tag}</Text>
                </View>
                <Text style={styles.scienceTitle}>{c.title}</Text>
                <Text style={styles.insightBody}>{c.body}</Text>
                {c.id === 'repetition' && (
                  <View style={styles.curveWrap}>
                    <Sparkline values={automaticityCurve(14)} markers={JOURNEY_MARKERS.map((m) => ({ at: m.at, label: m.label }))} />
                  </View>
                )}
              </View>
            ))}

            <Pressable
              onPress={() => navigation.navigate('Insights')}
              accessibilityRole="button"
              accessibilityLabel={t('fullLink.a11y')}
              style={styles.fullLink}
            >
              <Text style={styles.fullLinkText}>{t('fullLink.text')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function JourneyRow({ sessions, today, activityId, title, onPress, t }: { sessions: readonly ActivitySessionEvent[]; today: string; activityId: string; title: string; onPress: () => void; t: TFunction }) {
  const j = activityJourney(sessions, activityId, title, today);
  const cells = activityDayCells(sessions, activityId, today, 28);
  const statusColor = STATUS_COLOR[j.status];
  const statusLabel = t(`status.${j.status}`);
  const streakText = j.currentStreak > 0 ? t('journey.dayInRow', { days: j.currentStreak }) : t('journey.startAgain');
  const autoText = j.graduated ? t('journey.runsOnOwn') : t('journey.towardAutomatic', { value: j.progressPct });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('journey.a11y', { title, status: statusLabel })} style={styles.journeyCard}>
      <View style={styles.journeyHead}>
        <Text style={styles.journeyTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.journeyStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <DotGrid cells={cells} />
      <Text style={styles.journeySub}>
        {streakText} · {autoText} · {t('journey.view')}
      </Text>
    </Pressable>
  );
}

function feelWord(avg: number, t: TFunction): string {
  if (avg >= 4.5) return t('feel.wordExcellent');
  if (avg >= 3.5) return t('feel.wordGood');
  if (avg >= 2.5) return t('feel.wordOkay');
  return t('feel.wordGrind');
}

/** Plus forecast — projects when the next insight + automaticity land at current pace. */
function ForecastCard({ data, entitled, onUnlock, t }: { data: ScreenData; entitled: boolean; onUnlock: () => void; t: TFunction }) {
  const perDay = data.activeThisWeek / 7;
  const eta = (need: number): number | null => (need <= 0 ? 0 : perDay > 0 ? Math.ceil(need / perDay) : null);

  if (!entitled) {
    return (
      <Pressable onPress={onUnlock} accessibilityRole="button" style={[styles.forecastCard, styles.forecastLocked]}>
        <View style={styles.insightHead}>
          <Text style={styles.insightIcon}>🔮</Text>
          <Text style={styles.insightTitle}>{t('forecast.title')}</Text>
          <Text style={styles.plusTag}>{t('forecast.plusTag')}</Text>
        </View>
        <Text style={styles.insightBody}>{t('forecast.lockedBody')}</Text>
        <Text style={styles.forecastCta}>{t('forecast.cta')}</Text>
      </Pressable>
    );
  }

  const next = nextLockedTier(data.daysDone);
  const nextEta = next ? eta(next.unlockDays - data.daysDone) : null;
  const autoEta = eta(66 - data.longest);
  const perWeek = Math.round(perDay * 7);

  return (
    <View style={[styles.forecastCard, { borderColor: VIOLET }]}>
      <View style={styles.insightHead}>
        <Text style={styles.insightIcon}>🔮</Text>
        <Text style={styles.insightTitle}>{t('forecast.yourTitle')}</Text>
        <Text style={styles.plusTag}>{t('forecast.plusTag')}</Text>
      </View>
      {next ? (
        <Text style={styles.insightBody}>
          {t('forecast.nextUnlockPrefix')}<Text style={styles.bodyStrong}>{tierTitle(next.id, t)}</Text>{' '}
          {nextEta != null ? (nextEta === 0 ? t('forecast.etaSoon') : t('forecast.eta', { count: nextEta })) : t('forecast.etaKeepGoing')}.
        </Text>
      ) : (
        <Text style={styles.insightBody}>{t('forecast.allUnlocked')}</Text>
      )}
      <Text style={styles.insightBody}>
        {t('forecast.autoPrefix')}
        {autoEta != null ? (autoEta === 0 ? t('forecast.autoWithinReach') : t('forecast.autoAway', { count: autoEta })) : t('forecast.autoBuilds')}
        {t('forecast.autoPace', { count: perWeek })}
      </Text>
    </View>
  );
}

function InsightCard({ tier, data, goals, t, locale, weekdayNames }: { tier: InsightTier; data: ScreenData; goals: Goals; t: TFunction; locale: string; weekdayNames: string[] }) {
  const body = renderInsight(tier, data, goals, t, locale, weekdayNames);
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHead}>
        <Text style={styles.insightIcon}>{tier.icon}</Text>
        <Text style={styles.insightTitle}>{tierTitle(tier.id, t)}</Text>
      </View>
      {body}
    </View>
  );
}

function renderInsight(tier: InsightTier, data: ScreenData, goals: Goals, t: TFunction, locale: string, weekdayNames: string[]): React.ReactNode {
  const dayWord = (n: number) => t('insight.days', { count: n });
  switch (tier.id) {
    case 'streak':
      return (
        <Text style={styles.insightBody}>
          {data.streakDays > 0
            ? t('insight.streakActive', { streak: data.streakDays, longest: dayWord(data.longest) })
            : t('insight.streakReset', { longest: dayWord(data.longest) })}
        </Text>
      );
    case 'rhythm': {
      const { bestWeekday, bestHour } = data.summary;
      if (bestWeekday === null && bestHour === null) {
        return <Text style={styles.insightBody}>{t('insight.rhythmEmpty')}</Text>;
      }
      const day = bestWeekday !== null ? weekdayLabel(bestWeekday, weekdayNames) : null;
      const hr = bestHour !== null ? hourLabel(bestHour, locale) : null;
      const body =
        day && hr
          ? t('insight.rhythmDayTime', { day, hour: hr })
          : day
            ? t('insight.rhythmDay', { day })
            : t('insight.rhythmTime', { hour: hr });
      return <Text style={styles.insightBody}>{body}</Text>;
    }
    case 'anchor': {
      const top = data.activities[0];
      if (!top) return <Text style={styles.insightBody}>{t('insight.anchorEmpty')}</Text>;
      return (
        <Text style={styles.insightBody}>
          {t('insight.anchor', { count: top.summary.count, title: top.title })}
        </Text>
      );
    }
    case 'mix': {
      const top = data.categories[0];
      if (!top) return <Text style={styles.insightBody}>{t('insight.mixEmpty')}</Text>;
      const cat = resolveCategory(top.category);
      const meta = CATEGORY_META[cat];
      const goal = goals.find((g) => g.categories.includes(cat));
      return (
        <Text style={styles.insightBody}>
          {t('insight.mixIntro', { count: top.summary.count, label: meta?.label ?? top.category })}
          {goal ? t('insight.mixGoal', { goal: goal.title }) : t('insight.mixNoGoal')}
        </Text>
      );
    }
    case 'resilience': {
      const atBest = data.streakDays > 0 && data.streakDays >= data.longest;
      return (
        <Text style={styles.insightBody}>
          {t('insight.resilienceIntro', { longest: data.longest })}
          {atBest
            ? t('insight.resilienceAtBest')
            : t('insight.resilienceComeback', { count: data.streakDays })}
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
            {top
              ? t('insight.automaticTop', { count: streak, title: top.title })
              : t('insight.automaticNone')}
            {t('insight.automaticScience')}
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

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.xl },

  verdictCard: { borderRadius: radii.xl, padding: spacing.lg, gap: 6, borderLeftWidth: 5, ...shadows.md },
  verdictEmoji: { fontSize: 28 },
  verdictLabel: { ...typography.title, fontWeight: '800' },
  verdictReason: { ...typography.body, color: INK },

  weekCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md, ...shadows.md },
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

  counterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.xs },

  forecastCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, borderWidth: 2, borderColor: VIOLET_SOFT, ...shadows.md },
  forecastLocked: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET_SOFT },
  forecastCta: { ...typography.label, color: VIOLET, fontWeight: '800' },
  plusTag: { ...typography.caption, color: VIOLET, fontWeight: '800' },

  nextCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.md },
  nextText: { ...typography.body, color: INK },
  nextStrong: { fontWeight: '800' },
  nextSub: { ...typography.caption, color: MUTED },

  track: { height: 8, borderRadius: 4, backgroundColor: '#EEEDF4', overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: VIOLET },
  trackFillLock: { backgroundColor: LOCK },


  insightCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.md },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  insightIcon: { fontSize: 22 },
  insightTitle: { ...typography.title, color: INK, fontWeight: '700', flex: 1 },
  insightBody: { ...typography.body, color: INK },
  bodyStrong: { fontWeight: '800', color: VIOLET },

  feelCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.md },
  feelAvg: { ...typography.title, color: '#B5740A', fontWeight: '800' },

  journeyCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.md },
  journeyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  journeyTitle: { ...typography.title, color: INK, fontWeight: '800', flex: 1 },
  journeyStatus: { ...typography.caption, fontWeight: '800' },
  journeySub: { ...typography.caption, color: MUTED },

  scienceCard: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.xs, ...shadows.md },
  scienceTag: { ...typography.caption, color: MUTED, letterSpacing: 2, fontWeight: '800' },
  scienceTitle: { ...typography.title, color: INK, fontWeight: '800' },
  curveWrap: { marginTop: spacing.sm },

  lockedCard: { backgroundColor: '#F4F3F8', shadowOpacity: 0, elevation: 0 },
  lockIcon: { fontSize: 18 },
  lockedTitle: { ...typography.title, color: LOCK, fontWeight: '700', flex: 1 },
  lockBadge: { ...typography.caption, color: LOCK, fontWeight: '800' },
  lockedTeaser: { ...typography.body, color: MUTED },
  lockedHint: { ...typography.caption, color: LOCK },

  fullLink: { alignSelf: 'center', backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.xs },
  fullLinkText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
