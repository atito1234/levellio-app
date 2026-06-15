import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCapacities } from '@/state/CapacitiesContext';
import { CAPACITIES } from '@/lib/compounding';
import { dayKey } from '@/lib/dates';
import {
  addMonths,
  buildMonthMatrix,
  intensityLevel,
  isFutureMonth,
  monthLabel,
  monthOf,
  WEEKDAY_LABELS,
} from '@/lib/calendar';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MonthlyProgress'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const MUTED = '#5A5A72';
// Teal heatmap scale (gold stays reserved for 100% rings, never here).
const HEAT = ['#ECEAE4', '#CDEDE4', '#8FE0CE', '#46CBB0', '#16C8A8'] as const;

export function MonthlyProgressScreen({ navigation }: Props) {
  const { levels, history } = useCapacities();
  const now = new Date();
  const todayKey = dayKey(now);
  const [ref, setRef] = useState(() => monthOf(now));

  const weeks = useMemo(() => buildMonthMatrix(ref), [ref]);
  const nextDisabled = isFutureMonth(addMonths(ref, 1), now);
  const monthTotal = useMemo(
    () => weeks.flat().reduce((sum, c) => sum + (c.key ? history[c.key] ?? 0 : 0), 0),
    [weeks, history],
  );

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Your progress
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Insights')}
          accessibilityRole="button"
          accessibilityLabel="See your activity insights"
          hitSlop={10}
        >
          <Text style={styles.insightsLink}>Insights ›</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Current capacity rings (real, persisted). */}
        <Text style={styles.sectionLabel}>CAPACITIES NOW</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capStrip}>
          {CAPACITIES.map((cap) => {
            const lvl = Math.round(levels[cap.id]);
            return (
              <View key={cap.id} style={styles.capCell} accessibilityLabel={`${cap.name} ${lvl} percent`}>
                <View style={styles.capRingWrap}>
                  <CapacityRing level={lvl} colorId={cap.colorId} size={56} strokeWidth={6} />
                  <View style={styles.capRingCenter} pointerEvents="none">
                    <Text style={styles.capRingPct}>{lvl}%</Text>
                  </View>
                </View>
                <Text style={styles.capCellName}>{cap.name}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Month heatmap. */}
        <View style={styles.monthHead}>
          <Pressable onPress={() => setRef((r) => addMonths(r, -1))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10}>
            <Text style={styles.monthNav}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel(ref)}</Text>
          <Pressable
            onPress={() => !nextDisabled && setRef((r) => addMonths(r, 1))}
            disabled={nextDisabled}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: nextDisabled }}
            hitSlop={10}
          >
            <Text style={[styles.monthNav, nextDisabled && styles.navDisabled]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((cell, ci) => {
                if (!cell.key) return <View key={ci} style={styles.cellPad} />;
                const pts = history[cell.key] ?? 0;
                const isToday = cell.key === todayKey;
                const dayK = cell.key;
                return (
                  <Pressable
                    key={ci}
                    accessibilityRole="button"
                    accessibilityLabel={`${cell.key}, ${pts} capacity ${pts === 1 ? 'point' : 'points'}. See this day's activities`}
                    onPress={() => navigation.navigate('Insights', { day: dayK })}
                    style={[styles.cell, { backgroundColor: HEAT[intensityLevel(pts)] }, isToday && styles.cellToday]}
                  >
                    <Text style={[styles.cellDay, intensityLevel(pts) >= 3 && styles.cellDayOnDark]}>{cell.day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {HEAT.map((c, i) => (
            <View key={i} style={[styles.legendSwatch, { backgroundColor: c }]} />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>

        <Text style={styles.footnote}>
          {monthTotal > 0
            ? `${monthTotal} capacity points earned this month. Each completed habit adds to the days it strengthens.`
            : 'Complete habits to light up your month — each one adds capacity points to that day.'}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  insightsLink: { ...typography.label, color: '#6C4CF1', fontWeight: '700' },
  title: { ...typography.heading, color: INK },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  capStrip: { gap: spacing.md, paddingVertical: spacing.xs },
  capCell: { alignItems: 'center', gap: 4, width: 64 },
  capRingWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  capRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  capRingPct: { ...typography.caption, color: INK, fontWeight: '800', fontSize: 11 },
  capCellName: { ...typography.caption, color: MUTED, fontSize: 11 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  monthNav: { fontSize: 26, color: INK, width: 36, textAlign: 'center' },
  monthTitle: { ...typography.title, color: INK, fontWeight: '700' },
  navDisabled: { opacity: 0.3 },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekday: { ...typography.caption, color: MUTED, flex: 1, textAlign: 'center' },
  grid: { gap: 6 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cellPad: { flex: 1, aspectRatio: 1 },
  cellToday: { borderWidth: 2, borderColor: '#6C4CF1' },
  cellDay: { ...typography.caption, color: INK, fontSize: 11, fontWeight: '600' },
  cellDayOnDark: { color: '#FFFFFF' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  legendSwatch: { width: 16, height: 16, borderRadius: 4 },
  legendText: { ...typography.caption, color: MUTED },
  footnote: { ...typography.caption, color: MUTED, textAlign: 'center', paddingHorizontal: spacing.md, marginTop: spacing.sm },
});
