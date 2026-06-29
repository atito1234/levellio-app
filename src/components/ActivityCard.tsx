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
  onAddToday,
  onToday,
  groupName,
  groupAccent,
  groupSoft,
  onMoveGroup,
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
  /** Schedule this activity onto Home's Today ring (doing lives on Home). */
  onAddToday: () => void;
  /** True when the activity is already on today's plan. */
  onToday: boolean;
  /** Current group (bucket) name, if filed. */
  groupName?: string | null;
  groupAccent?: string;
  groupSoft?: string;
  /** Open the group picker (MoveToBucketSheet) for this activity. */
  onMoveGroup: () => void;
  onBattle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('projects');
  const [pickOpen, setPickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inGoals = goals.filter((g) => inGoalIds.has(g.id));
  // One accent per card: the group's colour when filed, else the project accent.
  const cardAccent = groupAccent ?? accent;

  return (
    <View style={[styles.card, { borderColor: `${cardAccent}29` }]}>
      <View style={styles.head}>
        <View style={[styles.emojiWrap, { backgroundColor: `${cardAccent}1A` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {contribution ? <Text style={[styles.contrib, { color: cardAccent }]}>{contribution}</Text> : null}
        </View>
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t('card.moreA11y', { title })}
          accessibilityState={{ expanded: menuOpen }}
          style={[styles.moreBtn, menuOpen && styles.moreBtnOn]}
          hitSlop={6}
        >
          <Text style={styles.moreDots}>•••</Text>
        </Pressable>
      </View>

      {/* Overflow: the secondary actions live here so the card stays calm. */}
      {menuOpen && (
        <View style={styles.menu}>
          <MenuRow icon="⚔️" label={t('card.battle')} onPress={() => { setMenuOpen(false); onBattle(); }} />
          <MenuRow icon="✎" label={t('card.edit')} onPress={() => { setMenuOpen(false); onEdit(); }} />
          <MenuRow icon="✕" label={t('card.remove')} tint={ROSE} onPress={() => { setMenuOpen(false); onRemove(); }} />
        </View>
      )}

      {/* Organize chips: group (bucket) + the goals this activity ladders into. */}
      <View style={styles.goalRow}>
        <Pressable
          onPress={onMoveGroup}
          accessibilityRole="button"
          accessibilityLabel={t('card.groupA11y', { title })}
          style={[
            styles.groupChip,
            groupName
              ? { backgroundColor: groupSoft ?? '#F4F1FE', borderColor: groupAccent ?? VIOLET }
              : styles.groupChipEmpty,
          ]}
        >
          <Text style={[styles.groupChipText, { color: groupName ? groupAccent ?? VIOLET : MUTED }]} numberOfLines={1}>
            {groupName ? `🗂️ ${groupName}` : t('card.addGroup')}
          </Text>
        </Pressable>
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

      {/* One clear action: send it to Home, where the doing happens. */}
      <Pressable
        onPress={onAddToday}
        accessibilityRole="button"
        accessibilityState={{ selected: onToday }}
        accessibilityLabel={onToday ? t('card.onTodayA11y', { title }) : t('card.addTodayA11y', { title })}
        style={[styles.primary, onToday ? styles.primaryOn : { backgroundColor: TEAL }]}
      >
        <Text style={[styles.primaryText, onToday && styles.primaryTextOn]}>
          {onToday ? t('card.onToday') : t('card.addToday')}
        </Text>
      </Pressable>
    </View>
  );
}

function MenuRow({ icon, label, tint = VIOLET, onPress }: { icon: string; label: string; tint?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.menuRow}>
      <Text style={[styles.menuIcon, { color: tint }]}>{icon}</Text>
      <Text style={[styles.menuLabel, { color: tint }]}>{label}</Text>
    </Pressable>
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
  card: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: TRACK, ...shadows.md },
  suggested: { borderStyle: 'dashed' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiWrap: { width: 56, height: 56, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  headText: { flex: 1, gap: 2 },
  title: { ...typography.title, color: INK, fontWeight: '800' },
  contrib: { ...typography.caption, fontWeight: '800' },

  moreBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5FB' },
  moreBtnOn: { backgroundColor: '#ECE9FA' },
  moreDots: { ...typography.label, color: MUTED, fontWeight: '900', letterSpacing: 1 },
  menu: { backgroundColor: '#FAFAFD', borderRadius: radii.md, padding: spacing.xs, gap: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.sm },
  menuIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  menuLabel: { ...typography.body, fontWeight: '700' },

  groupChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3, maxWidth: 180 },
  groupChipEmpty: { backgroundColor: '#F4F4F7', borderColor: TRACK, borderStyle: 'dashed' },
  groupChipText: { ...typography.caption, fontWeight: '800', fontSize: 11 },

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

  primary: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: 2 },
  primaryOn: { backgroundColor: '#EAFBF6' },
  primaryText: { ...typography.label, color: '#0B3D33', fontWeight: '800' },
  primaryTextOn: { color: '#0A6E5C' },

  adopt: { borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  adoptDone: { backgroundColor: '#EAFBF6' },
  adoptText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  adoptDoneText: { color: '#0A6E5C' },

  tile: { flex: 1, backgroundColor: CARD, borderRadius: radii.xl, borderWidth: 1.5, borderStyle: 'dashed', padding: spacing.lg, alignItems: 'center', gap: 4, minHeight: 104, justifyContent: 'center' },
  tileIcon: { fontSize: 26 },
  tileLabel: { ...typography.label, fontWeight: '800', textAlign: 'center' },
  tileSub: { ...typography.caption, color: MUTED, textAlign: 'center', fontSize: 10 },
});
