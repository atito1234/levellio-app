/**
 * A slim, one-line "ticker" of goals (your goals + project goals) plus a leading
 * "All" chip. Tapping a chip points the Home's swipable hero cards + ring at that
 * goal — a compact, news-feed-style switcher that keeps Home uncluttered. Each chip
 * shows today's progress %, tinted positive when there's movement.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, typography } from '@/theme';
import { useGoalProgress } from '@/state/GoalContext';
import { goalColor, type Goal } from '@/lib/goal';

const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';

export function GoalTicker({
  goals,
  selectedId,
  allPct,
  onSelect,
  onAddGoal,
  projectActivityIds,
}: {
  goals: Goal[];
  selectedId: string | null;
  allPct: number;
  onSelect: (goalId: string | null) => void;
  /** Open the gamified "become" goal-creation flow. */
  onAddGoal: () => void;
  projectActivityIds?: ReadonlySet<string>;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {/* "All" — today across every habit; clears any goal focus. */}
      <Chip
        label={t('ticker.all')}
        emoji="✨"
        pct={allPct}
        positive={allPct > 0}
        accent={VIOLET}
        selected={!selectedId}
        a11yLabel={t('ticker.allA11y', { pct: allPct })}
        onPress={() => onSelect(null)}
      />
      {goals.map((g) => (
        <GoalTickerChip
          key={g.id}
          goal={g}
          selected={g.id === selectedId}
          projectActivityIds={projectActivityIds}
          onPress={() => onSelect(g.id)}
        />
      ))}
      {/* Always-present entry to create a new goal (the "become" flow). */}
      <Pressable
        onPress={onAddGoal}
        accessibilityRole="button"
        accessibilityLabel={t('ticker.addGoalA11y')}
        style={styles.addChip}
      >
        <Text style={[styles.chipLabel, { color: VIOLET }]}>＋ {t('ticker.addGoal')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function GoalTickerChip({
  goal,
  selected,
  projectActivityIds,
  onPress,
}: {
  goal: Goal;
  selected: boolean;
  projectActivityIds?: ReadonlySet<string>;
  onPress: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const progress = useGoalProgress(goal, projectActivityIds);
  const pct = progress.plannedTodayInGoal > 0
    ? Math.round((progress.doneTodayInGoal / progress.plannedTodayInGoal) * 100)
    : 0;
  const c = goalColor(goal);
  return (
    <Chip
      label={goal.title}
      emoji={goal.emoji}
      pct={pct}
      positive={progress.doneTodayInGoal > 0}
      accent={c.accent}
      soft={c.soft}
      selected={selected}
      a11yLabel={t('goalCardA11y', {
        title: goal.title,
        done: progress.doneTodayInGoal,
        planned: progress.plannedTodayInGoal,
        pct: progress.weeklyConsistencyPct,
        selected: selected ? t('goalCardSelected') : '',
      })}
      onPress={onPress}
    />
  );
}

function Chip({
  label,
  emoji,
  pct,
  positive,
  accent,
  soft,
  selected,
  a11yLabel,
  onPress,
}: {
  label: string;
  emoji: string;
  pct: number;
  positive: boolean;
  accent: string;
  soft?: string;
  selected: boolean;
  a11yLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11yLabel}
      style={[styles.chip, selected && { borderColor: accent, backgroundColor: soft ?? '#F4F1FE' }]}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, selected && { color: accent }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.chipPct, { color: positive ? TEAL : colors.textMuted }]}>{pct}%</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8E6E0',
    maxWidth: 200,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2DBFB',
    backgroundColor: '#F4F1FE',
    borderStyle: 'dashed',
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: '800', flexShrink: 1 },
  chipPct: { ...typography.caption, fontWeight: '800', fontSize: 11 },
});
