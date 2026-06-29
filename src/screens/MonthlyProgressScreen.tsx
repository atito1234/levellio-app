import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer, ScreenHeader, SectionLabel } from '@/components';
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
} from '@/lib/calendar';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MonthlyProgress'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const MUTED = '#5A5A72';
// Teal heatmap scale (gold stays reserved for 100% rings, never here).
const HEAT = ['#ECEAE4', '#CDEDE4', '#8FE0CE', '#46CBB0', '#16C8A8'] as const;

export function MonthlyProgressScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation('monthly');
  const weekdays = t('common:weekdaysShort', { returnObjects: true }) as string[];
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
      <ScreenHeader
        title={t('title')}
        onBack={() => navigation.goBack()}
        backLabel={t('a11yBack')}
        right={
          <Pressable onPress={() => navigation.navigate('Insights')} accessibilityRole="button" accessibilityLabel={t('a11yInsights')} hitSlop={10}>
            <Text style={styles.insightsLink}>{t('insightsLink')}</Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Current capacity rings (real, persisted). */}
        <SectionLabel>{t('capacitiesNow')}</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capStrip}>
          {CAPACITIES.map((cap) => {
            const lvl = Math.round(levels[cap.id]);
            return (
              <View key={cap.id} style={styles.capCell} accessibilityLabel={t('a11yCapacity', { name: cap.name, value: lvl })}>
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
          <Pressable onPress={() => setRef((r) => addMonths(r, -1))} accessibilityRole="button" accessibilityLabel={t('a11yPrevMonth')} hitSlop={10}>
            <Text style={styles.monthNav}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel(ref, i18n.language)}</Text>
          <Pressable
            onPress={() => !nextDisabled && setRef((r) => addMonths(r, 1))}
            disabled={nextDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('a11yNextMonth')}
            accessibilityState={{ disabled: nextDisabled }}
            hitSlop={10}
          >
            <Text style={[styles.monthNav, nextDisabled && styles.navDisabled]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekdays.map((d, i) => (
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
                    accessibilityLabel={t('a11yDay', { count: pts, date: cell.key })}
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
          <Text style={styles.legendText}>{t('legendLess')}</Text>
          {HEAT.map((c, i) => (
            <View key={i} style={[styles.legendSwatch, { backgroundColor: c }]} />
          ))}
          <Text style={styles.legendText}>{t('legendMore')}</Text>
        </View>

        <Text style={styles.footnote}>
          {monthTotal > 0
            ? t('footnoteEarned', { points: monthTotal })
            : t('footnoteEmpty')}
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
