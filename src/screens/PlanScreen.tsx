import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AddActivityFab, AddActivitySheet, ProjectBadge, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useProjects } from '@/state/ProjectsContext';
import { usePlan } from '@/state/PlanContext';
import { useActivityLog } from '@/state/useActivityLog';
import { useMaterializeRecurring } from '@/hooks/useMaterializeRecurring';
import { groupHabitsIntoRails } from '@/lib/dashboard';
import { sessionDay, sessionsOf } from '@/lib/analytics';
import { daySchedule, dayCategoryColors, dominantColor, type DaySchedule } from '@/lib/scheduleCalendar';
import {
  addMonths,
  buildMonthMatrix,
  intensityLevel,
  monthLabel,
  monthOf,
  type MonthRef,
} from '@/lib/calendar';
import { CATEGORY_COLOR, CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { dayKey, dayDiff, relativeDayLabel, type RelativeDayLabels } from '@/lib/dates';
import { minutesToLabel } from '@/lib/schedule';
import { weekdaysLabel } from '@/lib/recurrence';
import { recurrenceLabelOpts } from '@/lib/recurrenceLabels';
import type { Quest } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Plan'>;
type CalView = 'month' | 'year';

// Locked palette (gold reserved for 100% rings — never here).
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#E3E3EC';

export function PlanScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation('plan');
  const dayLabels: RelativeDayLabels = { today: t('scheduler:today'), tomorrow: t('scheduler:tomorrow'), yesterday: t('scheduler:yesterday'), locale: i18n.language };
  const dayLabel = (k: string) => relativeDayLabel(k, todayK, dayLabels);
  const { quests } = useGame();
  const { buckets, assignments } = useBuckets();
  const { projectsForHabit } = useProjects();
  const { getPlan, togglePlanned } = usePlan();
  const { events } = useActivityLog();

  const todayK = dayKey(new Date());
  useMaterializeRecurring([todayK, route.params?.day ?? todayK]);

  const [view, setView] = useState<CalView>('month');
  const [selected, setSelected] = useState(() => route.params?.day ?? todayK);
  const [monthRef, setMonthRef] = useState<MonthRef>(() => {
    const [y, m] = selected.split('-').map(Number);
    return monthOf(new Date(y ?? 1970, (m ?? 1) - 1, 1));
  });
  const [year, setYear] = useState(() => Number(selected.slice(0, 4)));
  const [addOpen, setAddOpen] = useState(false);
  const [addDates, setAddDates] = useState<string[] | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // day → set of completed activity ids that day (for the colour-coded "done" heat).
  const doneByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sessionsOf(events)) {
      const d = sessionDay(s);
      const set = map.get(d) ?? new Set<string>();
      set.add(s.activityId);
      if (!map.has(d)) map.set(d, set);
    }
    return map;
  }, [events]);

  const summaryFor = useMemo(() => {
    const empty: ReadonlySet<string> = new Set();
    return (k: string): DaySchedule => daySchedule(k, quests, getPlan(k), doneByDay.get(k) ?? empty);
  }, [quests, getPlan, doneByDay]);

  const selSummary = summaryFor(selected);
  const isPastDay = dayDiff(todayK, selected) < 0;

  const rails = useMemo(() => groupHabitsIntoRails(quests, buckets, assignments), [quests, buckets, assignments]);
  const plannedSet = useMemo(() => new Set(getPlan(selected) ?? []), [getPlan, selected]);

  const openAddFor = (day: string) => {
    setAddDates([day]);
    setAddOpen(true);
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('title')}
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      {/* Month / Year view toggle. */}
      <View style={styles.viewBar} accessibilityRole="tablist">
        {(['month', 'year'] as CalView[]).map((v) => {
          const on = view === v;
          return (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.viewTab, on && styles.viewTabOn]}
            >
              <Text style={[styles.viewTabText, on && styles.viewTabTextOn]}>{v === 'month' ? t('month') : t('year')}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {view === 'month' ? (
          <MonthGrid
            monthRef={monthRef}
            onPrev={() => setMonthRef((r) => addMonths(r, -1))}
            onNext={() => setMonthRef((r) => addMonths(r, 1))}
            summaryFor={summaryFor}
            todayKey={todayK}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <YearGrid
            year={year}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
            summaryFor={summaryFor}
            todayKey={todayK}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              const [y, m] = d.split('-').map(Number);
              setMonthRef(monthOf(new Date(y ?? 1970, (m ?? 1) - 1, 1)));
            }}
          />
        )}

        <Legend />

        {/* Selected day panel. */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>{dayLabel(selected)}</Text>
            <Text style={styles.panelCount}>
              {selSummary.count === 0 ? t('nothingScheduled') : t('scheduledDone', { count: selSummary.count, done: selSummary.doneCount })}
            </Text>
          </View>

          {selSummary.scheduled.length > 0 && (
            <View style={styles.rows}>
              {selSummary.scheduled.map((q) => {
                const done = selSummary.doneIds.has(q.id);
                return (
                  <View key={q.id} style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[q.category] }]} />
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowTitle, done && styles.rowTitleDone]} numberOfLines={1}>
                        {q.title}
                      </Text>
                      {projectsForHabit(q.id).length > 0 && <ProjectBadge projects={projectsForHabit(q.id)} compact />}
                      {(q.scheduledTime !== undefined || q.scheduledDays?.length) && (
                        <Text style={styles.rowTime}>
                          {q.scheduledTime !== undefined ? `⏰ ${minutesToLabel(q.scheduledTime, i18n.language)}` : ''}
                          {q.scheduledTime !== undefined && q.scheduledDays?.length ? ' · ' : ''}
                          {q.scheduledDays?.length ? `↻ ${weekdaysLabel(q.scheduledDays, recurrenceLabelOpts(t))}` : ''}
                        </Text>
                      )}
                    </View>
                    {done ? (
                      <Text style={styles.doneTag}>✓</Text>
                    ) : !isPastDay ? (
                      <Pressable
                        onPress={() => void togglePlanned(selected, q.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('removeFromA11y', { title: q.title, day: dayLabel(selected) })}
                        hitSlop={10}
                      >
                        <Text style={styles.removeX}>✕</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {isPastDay ? (
            <Pressable
              onPress={() => navigation.navigate('Insights', { day: selected })}
              accessibilityRole="button"
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>{t('reviewDay')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => openAddFor(selected)}
                accessibilityRole="button"
                accessibilityLabel={t('addForA11y', { day: dayLabel(selected) })}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>{t('addFor', { day: dayLabel(selected) })}</Text>
              </Pressable>

              {rails.length > 0 && (
                <Pressable onPress={() => setShowLibrary((v) => !v)} accessibilityRole="button" style={styles.libraryToggle}>
                  <Text style={styles.libraryToggleText}>
                    {showLibrary ? t('hideHabits') : t('scheduleFrom')}
                  </Text>
                </Pressable>
              )}
              {showLibrary &&
                rails.map((rail) => (
                  <View key={rail.id} style={styles.librarySection}>
                    <Text style={styles.sectionLabel}>{rail.label.toUpperCase()}</Text>
                    <View style={styles.chips}>
                      {rail.habits.map((q) => {
                        const on = plannedSet.has(q.id);
                        return (
                          <Pressable
                            key={q.id}
                            onPress={() => void togglePlanned(selected, q.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={on ? t('chipRemoveA11y', { title: q.title }) : t('chipAddA11y', { title: q.title })}
                            style={[styles.habitChip, on && styles.habitChipOn]}
                          >
                            <Text style={[styles.habitChipText, on && styles.habitChipTextOn]}>
                              {on ? '✓ ' : '+ '}
                              {CATEGORY_META[q.category].icon} {q.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
            </>
          )}
        </View>
      </ScrollView>

      <AddActivityFab onPress={() => openAddFor(todayK)} />
      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} defaultDates={addDates} />
    </ScreenContainer>
  );
}

// --- Month grid -------------------------------------------------------------

function MonthGrid({
  monthRef,
  onPrev,
  onNext,
  summaryFor,
  todayKey,
  selected,
  onSelect,
}: {
  monthRef: MonthRef;
  onPrev: () => void;
  onNext: () => void;
  summaryFor: (k: string) => DaySchedule;
  todayKey: string;
  selected: string;
  onSelect: (k: string) => void;
}) {
  const { t, i18n } = useTranslation('plan');
  const weekShort = t('common:weekdaysShort', { returnObjects: true }) as string[];
  const weeks = buildMonthMatrix(monthRef);
  return (
    <View style={styles.calCard}>
      <View style={styles.calHead}>
        <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel={t('prevMonth')} hitSlop={10}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel(monthRef, i18n.language)}</Text>
        <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={t('nextMonth')} hitSlop={10}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {weekShort.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell, ci) => {
            if (!cell.key) return <View key={ci} style={styles.mCell} />;
            const s = summaryFor(cell.key);
            const isToday = cell.key === todayKey;
            const on = cell.key === selected;
            const allDone = s.count > 0 && s.doneCount >= s.count;
            return (
              <Pressable
                key={ci}
                onPress={() => onSelect(cell.key!)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('dayScheduledA11y', { day: cell.key, count: s.count })}
                style={[styles.mCell, styles.mDay, on && styles.mDayOn, isToday && !on && styles.mDayToday]}
              >
                <Text style={[styles.mDayText, on && styles.mDayTextOn]}>{cell.day}</Text>
                <View style={styles.dots}>
                  {allDone ? (
                    <Text style={[styles.allDone, on && styles.mDayTextOn]}>✓</Text>
                  ) : (
                    dayCategoryColors(s.categories, 3).map((c, i) => (
                      <View key={i} style={[styles.miniDot, { backgroundColor: on ? '#FFFFFF' : c }]} />
                    ))
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// --- Year grid --------------------------------------------------------------

function YearGrid({
  year,
  onPrev,
  onNext,
  summaryFor,
  todayKey,
  selected,
  onSelect,
}: {
  year: number;
  onPrev: () => void;
  onNext: () => void;
  summaryFor: (k: string) => DaySchedule;
  todayKey: string;
  selected: string;
  onSelect: (k: string) => void;
}) {
  const { t, i18n } = useTranslation('plan');
  const months: MonthRef[] = Array.from({ length: 12 }, (_, m) => ({ year, month: m }));
  return (
    <View style={styles.calCard}>
      <View style={styles.calHead}>
        <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel={t('prevYear')} hitSlop={10}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{year}</Text>
        <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={t('nextYear')} hitSlop={10}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.yearWrap}>
        {months.map((ref) => (
          <View key={ref.month} style={styles.miniMonth}>
            <Text style={styles.miniMonthLabel}>{monthLabel(ref, i18n.language).split(' ')[0]}</Text>
            <View style={styles.yearGridRows}>
              {buildMonthMatrix(ref).map((week, wi) => (
                <View key={wi} style={styles.yearWeek}>
                  {week.map((cell, ci) => {
                    if (!cell.key) return <View key={ci} style={styles.yCell} />;
                    const s = summaryFor(cell.key);
                    const color = dominantColor(s.categories);
                    const isToday = cell.key === todayKey;
                    const on = cell.key === selected;
                    const level = intensityLevel(s.count);
                    return (
                      <Pressable
                        key={ci}
                        onPress={() => onSelect(cell.key!)}
                        accessibilityRole="button"
                        accessibilityLabel={t('dayScheduledA11y', { day: cell.key, count: s.count })}
                        style={[
                          styles.yCell,
                          styles.yDay,
                          { backgroundColor: color ? color : '#ECEAE4', opacity: color ? 0.3 + level * 0.175 : 1 },
                          on && styles.yDayOn,
                          isToday && styles.yDayToday,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Legend() {
  const { t } = useTranslation('categories');
  return (
    <View style={styles.legend}>
      {CATEGORY_ORDER.map((c) => (
        <View key={c} style={styles.legendItem}>
          <View style={[styles.miniDot, { backgroundColor: CATEGORY_COLOR[c] }]} />
          <Text style={styles.legendText}>{t(c)}</Text>
        </View>
      ))}
    </View>
  );
}

const CELL_RADIUS = 12;
const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  title: { ...typography.heading, color: INK },

  viewBar: { flexDirection: 'row', backgroundColor: '#ECEAE4', borderRadius: 999, padding: 4, gap: 4 },
  viewTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: 999, alignItems: 'center' },
  viewTabOn: { backgroundColor: CARD },
  viewTabText: { ...typography.label, color: MUTED, fontWeight: '700' },
  viewTabTextOn: { color: VIOLET },

  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  calCard: { backgroundColor: CARD, borderRadius: 24, padding: spacing.md, gap: 6 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  nav: { ...typography.heading, color: VIOLET, width: 32, textAlign: 'center' },
  month: { ...typography.title, color: INK, fontWeight: '800' },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekday: { ...typography.caption, color: MUTED, flex: 1, textAlign: 'center', fontWeight: '700' },

  mCell: { flex: 1, aspectRatio: 1, borderRadius: CELL_RADIUS, alignItems: 'center', justifyContent: 'center' },
  mDay: { backgroundColor: '#F7F6F2' },
  mDayOn: { backgroundColor: VIOLET },
  mDayToday: { borderWidth: 2, borderColor: VIOLET },
  mDayText: { ...typography.label, color: INK, fontWeight: '700' },
  mDayTextOn: { color: '#FFFFFF' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2, alignItems: 'center' },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  allDone: { fontSize: 9, color: VIOLET, fontWeight: '800', lineHeight: 9 },

  yearWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  miniMonth: { width: '31%', gap: 3, marginBottom: spacing.sm },
  miniMonthLabel: { ...typography.caption, color: MUTED, fontWeight: '700' },
  yearGridRows: { gap: 2 },
  yearWeek: { flexDirection: 'row', gap: 2 },
  yCell: { flex: 1, aspectRatio: 1, borderRadius: 2 },
  yDay: {},
  yDayOn: { borderWidth: 1.5, borderColor: INK },
  yDayToday: { borderWidth: 1.5, borderColor: VIOLET },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { ...typography.caption, color: MUTED, fontSize: 10 },

  panel: { backgroundColor: CARD, borderRadius: 24, padding: spacing.lg, gap: spacing.md },
  panelHead: { gap: 2 },
  panelTitle: { ...typography.title, color: INK, fontWeight: '800' },
  panelCount: { ...typography.caption, color: MUTED },

  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600' },
  rowTitleDone: { color: MUTED, textDecorationLine: 'line-through' },
  rowTime: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  doneTag: { ...typography.body, color: '#16C8A8', fontWeight: '800' },
  removeX: { ...typography.body, color: MUTED, fontWeight: '800', paddingHorizontal: 4 },

  addBtn: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  addBtnText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  secondaryBtn: { backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  secondaryBtnText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  libraryToggle: { alignItems: 'center', paddingVertical: spacing.xs },
  libraryToggleText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  librarySection: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  habitChip: { backgroundColor: '#F7F6F2', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  habitChipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  habitChipText: { ...typography.caption, color: INK, fontWeight: '600' },
  habitChipTextOn: { color: VIOLET, fontWeight: '800' },
});
