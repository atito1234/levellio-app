import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MonthCalendar } from './MonthCalendar';
import { spacing, typography } from '@/theme';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey, relativeDayLabel, type RelativeDayLabels } from '@/lib/dates';
import type { Quest } from '@/types';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const EMPTY: ReadonlySet<string> = new Set();

/**
 * An interactive calendar + day panel (same look as the home Schedule screen)
 * scoped to a set of activities. Tap any day to schedule/unschedule those
 * activities on it (any time of year), or add a new one for that day.
 */
export function MiniScheduler({
  quests,
  getPlan,
  togglePlanned,
  doneByDay,
  accent = VIOLET,
  onAddForDay,
}: {
  quests: readonly Quest[];
  getPlan: (k: string) => readonly string[] | undefined;
  togglePlanned: (day: string, questId: string) => Promise<void> | void;
  doneByDay: Map<string, Set<string>>;
  accent?: string;
  onAddForDay?: (day: string) => void;
}) {
  const { t, i18n } = useTranslation('scheduler');
  const dayLabels: RelativeDayLabels = { today: t('today'), tomorrow: t('tomorrow'), yesterday: t('yesterday'), locale: i18n.language };
  const todayK = dayKey(new Date());
  const [selected, setSelected] = useState(todayK);
  const plannedSet = useMemo(() => new Set(getPlan(selected) ?? []), [getPlan, selected]);
  const doneSet = doneByDay.get(selected) ?? EMPTY;
  const isPast = selected < todayK;
  const selectedLabel = relativeDayLabel(selected, todayK, dayLabels);

  return (
    <View style={styles.wrap}>
      <MonthCalendar quests={quests} getPlan={getPlan} doneByDay={doneByDay} todayKey={todayK} selected={selected} onSelectDay={setSelected} />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{selectedLabel}</Text>
        {quests.length === 0 ? (
          <Text style={styles.empty}>{t('noActivities')}</Text>
        ) : (
          quests.map((q) => {
            const planned = plannedSet.has(q.id);
            const done = doneSet.has(q.id);
            const state = done ? t('stateDone') : planned ? t('stateScheduled') : t('stateNot');
            const tail = done ? '' : t('tapTo', { action: planned ? t('actionUnschedule') : t('actionSchedule') });
            return (
              <Pressable
                key={q.id}
                onPress={() => void togglePlanned(selected, q.id)}
                disabled={done}
                accessibilityRole="button"
                accessibilityState={{ selected: planned || done }}
                accessibilityLabel={t('rowA11y', { state, title: q.title, day: selectedLabel, tail })}
                style={styles.row}
              >
                <Text style={styles.rowIcon}>{CATEGORY_META[q.category].icon}</Text>
                <Text style={[styles.rowTitle, done && styles.rowTitleDone]} numberOfLines={1}>{q.title}</Text>
                {done ? (
                  <Text style={styles.doneTag}>{t('doneTag')}</Text>
                ) : (
                  <View style={[styles.check, planned && { backgroundColor: accent, borderColor: accent }]}>
                    {planned && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
        {onAddForDay && !isPast && (
          <Pressable onPress={() => onAddForDay(selected)} accessibilityRole="button" accessibilityLabel={t('addForA11y', { day: selectedLabel })} style={[styles.addBtn, { backgroundColor: accent }]}>
            <Text style={styles.addText}>{t('addFor', { day: selectedLabel })}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  panel: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  panelTitle: { ...typography.title, color: INK, fontWeight: '800' },
  empty: { ...typography.body, color: MUTED },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  rowIcon: { fontSize: 18 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600', flex: 1 },
  rowTitleDone: { color: MUTED },
  doneTag: { ...typography.label, color: TEAL, fontWeight: '800' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: TRACK, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  addBtn: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  addText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
