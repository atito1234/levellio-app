import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { usePlan } from '@/state/PlanContext';
import { habitsForCapacity } from '@/lib/plan';
import { getCapacity, type CapacityId } from '@/lib/compounding';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { minutesToLabel } from '@/lib/schedule';
import type { Quest } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CapacityFocus'>;

// Locked palette (gold reserved for 100% rings — never on a partial value here).
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';

export function CapacityFocusScreen({ route, navigation }: Props) {
  const capacityId = route.params.capacityId as CapacityId;
  const cap = getCapacity(capacityId);
  const { quests } = useGame();
  const { levels } = useCapacities();
  const { getPlan, togglePlanned } = usePlan();

  const todayK = dayKey(new Date());
  const plannedSet = useMemo(() => new Set(getPlan(todayK) ?? []), [getPlan, todayK]);
  const habits = useMemo(() => habitsForCapacity(quests, capacityId), [quests, capacityId]);
  const inPlan = habits.filter((h) => plannedSet.has(h.id));
  const notPlanned = habits.filter((h) => !plannedSet.has(h.id));
  const level = Math.round(levels[capacityId] ?? 0);

  const PlanRow = ({ quest }: { quest: Quest }) => (
    <Pressable
      onPress={() => navigation.navigate('Ripple', { questId: quest.id })}
      accessibilityRole="button"
      accessibilityLabel={`${quest.title}${quest.completed ? ', done today' : ', do it now'}`}
      style={styles.row}
    >
      <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {quest.title}
        </Text>
        {quest.scheduledTime !== undefined && <Text style={styles.rowTime}>⏰ {minutesToLabel(quest.scheduledTime)}</Text>}
      </View>
      <Text style={[styles.action, quest.completed && styles.actionDone]}>{quest.completed ? '✓ Done' : 'Do it ›'}</Text>
    </Pressable>
  );

  const AddRow = ({ quest }: { quest: Quest }) => (
    <Pressable
      onPress={() => void togglePlanned(todayK, quest.id)}
      accessibilityRole="button"
      accessibilityLabel={`Add ${quest.title} to today's plan`}
      style={styles.row}
    >
      <Text style={styles.rowIcon}>{CATEGORY_META[quest.category].icon}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {quest.title}
        </Text>
      </View>
      <Text style={styles.addAction}>+ Add</Text>
    </Pressable>
  );

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.kicker}>CAPACITY</Text>
        <View style={styles.chevronSpacer} />
      </View>

      <View style={styles.header}>
        <View style={styles.ringWrap}>
          <CapacityRing level={level} colorId={cap.colorId} size={72} strokeWidth={8} />
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={styles.ringPct}>{level}%</Text>
          </View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {cap.name}
        </Text>
        <Text style={styles.sub}>Habits that strengthen {cap.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {habits.length === 0 ? (
          <Text style={styles.empty}>No habits feed this capacity yet. Add one that does to grow it.</Text>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>IN TODAY’S PLAN</Text>
              {inPlan.length === 0 ? (
                <Text style={styles.sectionHint}>None planned today — add one below to grow {cap.name}.</Text>
              ) : (
                <View style={styles.rows}>
                  {inPlan.map((q) => (
                    <PlanRow key={q.id} quest={q} />
                  ))}
                </View>
              )}
            </View>

            {notPlanned.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>NOT PLANNED YET</Text>
                <View style={styles.rows}>
                  {notPlanned.map((q) => (
                    <AddRow key={q.id} quest={q} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },

  header: { alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.md },
  ringWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringPct: { ...typography.label, color: INK, fontWeight: '800' },
  title: { ...typography.heading, color: INK },
  sub: { ...typography.body, color: MUTED, textAlign: 'center' },

  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  sectionHint: { ...typography.caption, color: MUTED },
  rows: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 18, padding: spacing.md },
  rowIcon: { fontSize: 20 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: INK, fontWeight: '600' },
  rowTime: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  action: { ...typography.label, color: VIOLET, fontWeight: '700' },
  actionDone: { color: MUTED },
  addAction: { ...typography.label, color: VIOLET, fontWeight: '700', backgroundColor: VIOLET_SOFT, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.lg },
});
