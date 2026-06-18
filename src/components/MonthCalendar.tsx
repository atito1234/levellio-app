import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { addMonths, buildMonthMatrix, monthLabel, monthOf, WEEKDAY_LABELS, type MonthRef } from '@/lib/calendar';
import { daySchedule, dayCategoryColors } from '@/lib/scheduleCalendar';
import type { Quest } from '@/types';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const CELL_RADIUS = 12;
const EMPTY: ReadonlySet<string> = new Set();

/**
 * A read-only month calendar (same look as the Plan/Schedule screen) scoped to a
 * set of activities — shows each day's category dots and a ✓ when all are done.
 * Used to surface a goal's (or project's) completions in calendar format.
 */
export function MonthCalendar({
  quests,
  getPlan,
  doneByDay,
  todayKey,
}: {
  quests: readonly Quest[];
  getPlan: (k: string) => readonly string[] | undefined;
  doneByDay: Map<string, Set<string>>;
  todayKey: string;
}) {
  const [monthRef, setMonthRef] = useState<MonthRef>(() => monthOf(new Date()));
  const weeks = useMemo(() => buildMonthMatrix(monthRef), [monthRef]);
  const summaryFor = (k: string) => daySchedule(k, quests, getPlan(k), doneByDay.get(k) ?? EMPTY);

  return (
    <View style={styles.calCard}>
      <View style={styles.calHead}>
        <Pressable onPress={() => setMonthRef((r) => addMonths(r, -1))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel(monthRef)}</Text>
        <Pressable onPress={() => setMonthRef((r) => addMonths(r, 1))} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((d, i) => (
          <Text key={i} style={styles.weekday}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell, ci) => {
            if (!cell.key) return <View key={ci} style={styles.cell} />;
            const s = summaryFor(cell.key);
            const isToday = cell.key === todayKey;
            const allDone = s.count > 0 && s.doneCount >= s.count;
            return (
              <View key={ci} style={[styles.cell, styles.day, isToday && styles.dayToday]}>
                <Text style={styles.dayText}>{cell.day}</Text>
                <View style={styles.dots}>
                  {allDone ? (
                    <Text style={styles.allDone}>✓</Text>
                  ) : (
                    dayCategoryColors(s.categories, 3).map((c, i) => <View key={i} style={[styles.miniDot, { backgroundColor: c }]} />)
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calCard: { backgroundColor: CARD, borderRadius: 24, padding: spacing.md, gap: 6 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  nav: { ...typography.heading, color: VIOLET, width: 32, textAlign: 'center' },
  month: { ...typography.title, color: INK, fontWeight: '800' },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekday: { ...typography.caption, color: MUTED, flex: 1, textAlign: 'center', fontWeight: '700' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: CELL_RADIUS, alignItems: 'center', justifyContent: 'center' },
  day: { backgroundColor: '#F7F6F2' },
  dayToday: { borderWidth: 2, borderColor: VIOLET },
  dayText: { ...typography.label, color: INK, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2, alignItems: 'center' },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  allDone: { fontSize: 9, color: VIOLET, fontWeight: '800', lineHeight: 9 },
});
