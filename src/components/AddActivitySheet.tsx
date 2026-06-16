import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { usePlan } from '@/state/PlanContext';
import { goalColor } from '@/lib/goal';
import { getBucketColor } from '@/lib/buckets';
import { dayKey } from '@/lib/dates';
import type { QuestCategory } from '@/types';

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

/**
 * Dead-simple "add an activity" sheet: type or speak the name, optionally tap a
 * GOAL and/or a BUCKET to file it, and add. Stays open for rapid multi-add. Files
 * by setting the quest's category (goal) and/or assigning it to a bucket, and
 * drops it onto today's plan so it shows up immediately.
 */
export function AddActivitySheet({
  visible,
  onClose,
  defaultGoalId = null,
  defaultBucketId = null,
}: {
  visible: boolean;
  onClose: () => void;
  defaultGoalId?: string | null;
  defaultBucketId?: string | null;
}) {
  const { quests, addQuest } = useGame();
  const { goals } = useGoals();
  const { buckets, assignments, assignActivity } = useBuckets();
  const { togglePlanned } = usePlan();

  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState<string | null>(defaultGoalId);
  const [bucketId, setBucketId] = useState<string | null>(defaultBucketId);
  const [added, setAdded] = useState<string | null>(null);

  // Re-sync defaults whenever the sheet (re)opens for a specific context.
  React.useEffect(() => {
    if (visible) {
      setGoalId(defaultGoalId);
      setBucketId(defaultBucketId);
      setTitle('');
      setAdded(null);
    }
  }, [visible, defaultGoalId, defaultBucketId]);

  // Best category for a bucket = the most common category among its activities.
  const bucketCategory = useMemo(() => {
    return (id: string): QuestCategory => {
      const counts = new Map<QuestCategory, number>();
      for (const q of quests) {
        if (assignments[q.id] === id) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
      }
      let best: QuestCategory = 'health';
      let bestN = 0;
      for (const [cat, n] of counts) if (n > bestN) ((best = cat), (bestN = n));
      return best;
    };
  }, [quests, assignments]);

  const selectedGoal = goals.find((g) => g.id === goalId) ?? null;

  const add = async () => {
    const name = title.trim();
    if (name.length === 0) return;
    const category: QuestCategory = selectedGoal
      ? selectedGoal.categories[0] ?? 'health'
      : bucketId
        ? bucketCategory(bucketId)
        : 'health';
    const quest = await addQuest({ title: name, category, difficulty: 'easy' });
    if (quest) {
      if (bucketId) await assignActivity(quest.id, bucketId);
      await togglePlanned(dayKey(new Date()), quest.id); // show it today right away
      setAdded(name);
    }
    setTitle('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Add an activity</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Done" hitSlop={12}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>

          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (added) setAdded(null);
            }}
            placeholder="Type or 🎙️ speak it (e.g. 10 push-ups)"
            placeholderTextColor={MUTED}
            style={styles.input}
            autoFocus
            maxLength={60}
            onSubmitEditing={() => void add()}
            returnKeyType="done"
            blurOnSubmit={false}
            accessibilityLabel="New activity name"
          />

          {goals.length > 0 && (
            <>
              <Text style={styles.label}>Goal (optional)</Text>
              <View style={styles.chips}>
                {goals.map((g) => {
                  const on = goalId === g.id;
                  const c = goalColor(g);
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setGoalId(on ? null : g.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                    >
                      <Text style={[styles.chipText, on && { color: c.accent }]}>
                        {g.emoji} {g.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {buckets.length > 0 && (
            <>
              <Text style={styles.label}>Group (optional)</Text>
              <View style={styles.chips}>
                {buckets.map((b) => {
                  const on = bucketId === b.id;
                  const c = getBucketColor(b.colorId);
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setBucketId(on ? null : b.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                    >
                      <Text style={[styles.chipText, on && { color: c.accent }]}>{b.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {added && <Text style={styles.added}>✓ Added “{added}” — add another, or tap Done.</Text>}

          <Pressable
            onPress={() => void add()}
            disabled={title.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Add activity"
            style={[styles.addBtn, title.trim().length === 0 && styles.addBtnOff]}
          >
            <Text style={styles.addBtnText}>＋ Add activity</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: spacing.sm, maxHeight: '85%' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.heading, color: INK },
  done: { ...typography.label, color: VIOLET, fontWeight: '800' },
  input: { ...typography.title, color: INK, backgroundColor: CARD, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  label: { ...typography.label, color: MUTED, letterSpacing: 1, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipText: { ...typography.label, color: INK, fontWeight: '600' },
  added: { ...typography.caption, color: '#0A6E5C', fontWeight: '700' },
  addBtn: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
});
