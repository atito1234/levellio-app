import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography } from '@/theme';
import { addMonths, buildMonthMatrix, monthLabel, monthOf, type MonthRef } from '@/lib/calendar';

/**
 * Compact month calendar for picking one or more dates. Reuses the pure calendar
 * helpers (buildMonthMatrix etc.). Days before `min` are disabled; selected days
 * fill violet; today is ringed. Multi-select via `selected` + `onToggle`.
 */
export function MiniCalendar({
  selected,
  onToggle,
  min,
  todayKey,
}: {
  selected: readonly string[];
  onToggle: (dayKey: string) => void;
  min?: string;
  todayKey: string;
}) {
  const { t, i18n } = useTranslation('scheduler');
  const weekShort = t('common:weekdaysShort', { returnObjects: true }) as string[];
  const [ref, setRef] = useState<MonthRef>(() => {
    const [y, m] = (min ?? todayKey).split('-').map(Number);
    return monthOf(new Date(y ?? 1970, (m ?? 1) - 1, 1));
  });
  const weeks = buildMonthMatrix(ref);
  const sel = new Set(selected);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => setRef((r) => addMonths(r, -1))} accessibilityRole="button" accessibilityLabel={t('prevMonth')} hitSlop={10}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel(ref, i18n.language)}</Text>
        <Pressable onPress={() => setRef((r) => addMonths(r, 1))} accessibilityRole="button" accessibilityLabel={t('nextMonth')} hitSlop={10}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {weekShort.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((cell, ci) => {
            if (!cell.key) return <View key={ci} style={styles.cell} />;
            const disabled = !!min && cell.key < min;
            const on = sel.has(cell.key);
            const isToday = cell.key === todayKey;
            return (
              <Pressable
                key={ci}
                onPress={() => !disabled && onToggle(cell.key!)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled }}
                accessibilityLabel={cell.key}
                style={[styles.cell, styles.day, on && styles.dayOn, isToday && !on && styles.dayToday]}
              >
                <Text style={[styles.dayText, disabled && styles.dayTextOff, on && styles.dayTextOn]}>{cell.day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  nav: { ...typography.heading, color: colors.identity, width: 32, textAlign: 'center' },
  month: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 6 },
  weekday: { ...typography.caption, color: colors.textSecondary, flex: 1, textAlign: 'center', fontWeight: '700' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  day: { backgroundColor: colors.surface },
  dayOn: { backgroundColor: colors.identity },
  dayToday: { borderWidth: 2, borderColor: colors.identity },
  dayText: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  dayTextOff: { color: colors.border },
  dayTextOn: { color: '#FFFFFF' },
});
