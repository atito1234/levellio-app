import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radii, shadows, spacing, typography } from '@/theme';
import { getBucketColor } from '@/lib/buckets';
import { goalColor, type Goal } from '@/lib/goal';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const ROSE = '#C0202C';

/**
 * A big, friendly activity card for the project panel. Two flavours:
 *  - OwnedActivityCard: a habit you've made yours — Do / Battle / Edit / Remove,
 *    plus an inline goal picker so it ladders into your goals.
 *  - SuggestedActivityCard: a project idea you can adopt in one tap.
 */
export function OwnedActivityCard({
  emoji,
  title,
  contribution,
  accent,
  goals,
  inGoalIds,
  onToggleGoal,
  onNewGoal,
  onDo,
  onBattle,
  onEdit,
  onRemove,
}: {
  emoji: string;
  title: string;
  contribution?: string;
  accent: string;
  goals: Goal[];
  inGoalIds: Set<string>;
  onToggleGoal: (goalId: string) => void;
  onNewGoal: () => void;
  onDo: () => void;
  onBattle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('projects');
  const [pickOpen, setPickOpen] = useState(false);
  const inGoals = goals.filter((g) => inGoalIds.has(g.id));

  return (
    <View style={[styles.card, { borderColor: `${accent}33` }]}>
      <View style={styles.head}>
        <View style={[styles.emojiWrap, { backgroundColor: `${accent}1A` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {contribution ? <Text style={[styles.contrib, { color: accent }]}>{contribution}</Text> : null}
        </View>
      </View>

      {/* Goals this activity ladders into — tap to add/remove. */}
      <View style={styles.goalRow}>
        {inGoals.map((g) => {
          const c = goalColor(g);
          return (
            <Pressable
              key={g.id}
              onPress={() => onToggleGoal(g.id)}
              accessibilityRole="button"
              accessibilityLabel={t('card.inGoalA11y', { goal: g.title })}
              style={[styles.goalChip, { backgroundColor: c.soft, borderColor: c.accent }]}
            >
              <Text style={[styles.goalChipText, { color: c.accent }]} numberOfLines={1}>{g.emoji} {g.title} ✓</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setPickOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={t('card.addGoalA11y')} style={styles.addGoalChip}>
          <Text style={styles.addGoalText}>{pickOpen ? t('card.goalDone') : t('card.addGoal')}</Text>
        </Pressable>
      </View>

      {pickOpen && (
        <View style={styles.picker}>
          {goals.filter((g) => !inGoalIds.has(g.id)).map((g) => {
            const c = goalColor(g);
            return (
              <Pressable key={g.id} onPress={() => onToggleGoal(g.id)} accessibilityRole="button" accessibilityLabel={t('card.addToGoalA11y', { goal: g.title })} style={[styles.pickChip, { borderColor: c.accent }]}>
                <Text style={[styles.pickChipText, { color: c.accent }]} numberOfLines={1}>＋ {g.emoji} {g.title}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={onNewGoal} accessibilityRole="button" accessibilityLabel={t('card.newGoalA11y')} style={styles.pickNew}>
            <Text style={styles.pickNewText}>{t('card.newGoal')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onDo} accessibilityRole="button" accessibilityLabel={t('card.doNowA11y', { title })} style={[styles.primary, { backgroundColor: TEAL }]}>
          <Text style={styles.primaryText}>{t('card.doNow')}</Text>
        </Pressable>
        <Pressable onPress={onBattle} accessibilityRole="button" accessibilityLabel={t('card.battleA11y', { title })} style={styles.ghost} hitSlop={6}>
          <Text style={styles.ghostText}>⚔️</Text>
        </Pressable>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('card.editA11y', { title })} style={styles.ghost} hitSlop={6}>
          <Text style={styles.ghostText}>✎</Text>
        </Pressable>
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('card.removeA11y', { title })} style={styles.ghost} hitSlop={6}>
          <Text style={[styles.ghostText, { color: ROSE }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SuggestedActivityCard({
  emoji,
  title,
  contribution,
  accent,
  added,
  onAdd,
  onEdit,
}: {
  emoji: string;
  title: string;
  contribution?: string;
  accent: string;
  added: boolean;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation('projects');
  return (
    <View style={[styles.card, styles.suggested]}>
      <View style={styles.head}>
        <View style={[styles.emojiWrap, { backgroundColor: `${accent}1A` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {contribution ? <Text style={[styles.contrib, { color: accent }]}>{contribution}</Text> : null}
        </View>
      </View>
      <Pressable
        onPress={added ? onEdit : onAdd}
        accessibilityRole="button"
        accessibilityLabel={added ? t('card.suggestedYoursA11y', { title }) : t('card.suggestedAddA11y', { title })}
        style={[styles.adopt, added ? styles.adoptDone : { backgroundColor: VIOLET }]}
      >
        <Text style={[styles.adoptText, added && styles.adoptDoneText]}>{added ? t('card.yoursEdit') : t('card.addToActivities')}</Text>
      </Pressable>
    </View>
  );
}

/** A big "tile" CTA used for New activity / Ask peers at the top of the panel. */
export function ActivityTile({ icon, label, sub, onPress, tint = VIOLET }: { icon: string; label: string; sub?: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.tile, { borderColor: `${tint}55` }]}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={[styles.tileLabel, { color: tint }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={styles.tileSub} numberOfLines={2}>{sub}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: TRACK, ...shadows.md },
  suggested: { borderStyle: 'dashed' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiWrap: { width: 52, height: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  headText: { flex: 1, gap: 2 },
  title: { ...typography.title, color: INK, fontWeight: '800' },
  contrib: { ...typography.caption, fontWeight: '800' },

  goalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  goalChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3, maxWidth: 180 },
  goalChipText: { ...typography.caption, fontWeight: '800', fontSize: 11 },
  addGoalChip: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3, backgroundColor: '#F4F1FE' },
  addGoalText: { ...typography.caption, color: VIOLET, fontWeight: '800', fontSize: 11 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, backgroundColor: '#FAFAFD', borderRadius: radii.md, padding: spacing.sm },
  pickChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: CARD, maxWidth: 200 },
  pickChipText: { ...typography.caption, fontWeight: '700', fontSize: 11 },
  pickNew: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: VIOLET },
  pickNewText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800', fontSize: 11 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: { flex: 1, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  primaryText: { ...typography.label, color: '#0B3D33', fontWeight: '800' },
  ghost: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: '#F4F1FE', alignItems: 'center', justifyContent: 'center' },
  ghostText: { ...typography.title, color: VIOLET, fontWeight: '800' },

  adopt: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  adoptDone: { backgroundColor: '#EAFBF6' },
  adoptText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  adoptDoneText: { color: '#0A6E5C' },

  tile: { flex: 1, backgroundColor: CARD, borderRadius: radii.xl, borderWidth: 1.5, borderStyle: 'dashed', padding: spacing.lg, alignItems: 'center', gap: 4, minHeight: 104, justifyContent: 'center' },
  tileIcon: { fontSize: 26 },
  tileLabel: { ...typography.label, fontWeight: '800', textAlign: 'center' },
  tileSub: { ...typography.caption, color: MUTED, textAlign: 'center', fontSize: 10 },
});
