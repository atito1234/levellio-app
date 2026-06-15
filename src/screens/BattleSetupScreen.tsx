import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useBuckets } from '@/state/BucketsContext';
import { useGoals } from '@/state/GoalContext';
import { useBattles } from '@/state/BattlesContext';
import { activitiesInBucket } from '@/lib/buckets';
import { goalHabits } from '@/lib/goal';
import { plannedOpen } from '@/lib/plan';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { TECHNIQUES, clampCustomMinutes, type TechniqueId } from '@/lib/timeTechniques';
import { DRAGONS, CUSTOM_DRAGON_ID } from '@/data/dragons';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BattleSetup'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

export function BattleSetupScreen({ route, navigation }: Props) {
  const { questId, bucketId, goalId } = route.params ?? {};
  const { quests } = useGame();
  const { getPlan } = usePlan();
  const { assignments, buckets } = useBuckets();
  const { goals } = useGoals();
  const { lastTechniqueId, lastCustomMin, setTechnique } = useBattles();

  const activeQuests = useMemo(() => quests.filter((q) => !q.completed), [quests]);

  // Which habits are preselected, based on where the battle was started from.
  const preselected = useMemo(() => {
    if (questId) return new Set([questId]);
    if (bucketId) return new Set(activitiesInBucket({ buckets, assignments }, bucketId));
    if (goalId) {
      const goal = goals.find((g) => g.id === goalId);
      return new Set(goal ? goalHabits(activeQuests, goal).map((q) => q.id) : []);
    }
    return new Set(plannedOpen(quests, getPlan(dayKey(new Date()))).map((q) => q.id));
  }, [questId, bucketId, goalId, buckets, assignments, goals, activeQuests, quests, getPlan]);

  const [selected, setSelected] = useState<Set<string>>(preselected);
  const [techniqueId, setTechniqueId] = useState<TechniqueId>(lastTechniqueId ?? 'pomodoro');
  const [customMin, setCustomMin] = useState<number>(lastCustomMin ?? 20);
  const [dragonId, setDragonId] = useState<string>(DRAGONS[0]!.id);
  const [dragonName, setDragonName] = useState('');

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const canFight = selected.size > 0 && (dragonId !== CUSTOM_DRAGON_ID || dragonName.trim().length > 0);

  const begin = async () => {
    if (!canFight) return;
    await setTechnique(techniqueId, techniqueId === 'custom' ? clampCustomMinutes(customMin) : undefined);
    navigation.replace('Battle', {
      questIds: [...selected],
      techniqueId,
      ...(techniqueId === 'custom' ? { customMin: clampCustomMinutes(customMin) } : {}),
      dragonId,
      ...(dragonId === CUSTOM_DRAGON_ID ? { dragonName: dragonName.trim() } : {}),
    });
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Prepare for battle
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>HABITS TO TACKLE ({selected.size})</Text>
        <Text style={styles.hint}>Bundle as many as you like into one block — or just one.</Text>
        <View style={styles.list}>
          {activeQuests.length === 0 ? (
            <Text style={styles.empty}>No open habits today. Add some first.</Text>
          ) : (
            activeQuests.map((q) => {
              const on = selected.has(q.id);
              return (
                <Pressable
                  key={q.id}
                  onPress={() => toggle(q.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${q.title}${on ? ', selected' : ''}`}
                  style={[styles.row, on && styles.rowOn]}
                >
                  <Text style={styles.rowIcon}>{CATEGORY_META[q.category].icon}</Text>
                  <Text style={[styles.rowTitle, on && styles.rowTitleOn]} numberOfLines={1}>
                    {q.title}
                  </Text>
                  <Text style={[styles.check, on && styles.checkOn]}>{on ? '✓' : '+'}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>TECHNIQUE</Text>
        <View style={styles.chips}>
          {TECHNIQUES.map((t) => {
            const on = techniqueId === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTechniqueId(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${t.name}. ${t.blurb}`}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.name}</Text>
              </Pressable>
            );
          })}
        </View>
        {techniqueId === 'custom' && (
          <View style={styles.stepper}>
            <Pressable onPress={() => setCustomMin((m) => clampCustomMinutes(m - 5))} accessibilityRole="button" accessibilityLabel="Decrease minutes" style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>–</Text>
            </Pressable>
            <Text style={styles.stepVal}>{clampCustomMinutes(customMin)} min</Text>
            <Pressable onPress={() => setCustomMin((m) => clampCustomMinutes(m + 5))} accessibilityRole="button" accessibilityLabel="Increase minutes" style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>CHOOSE YOUR DRAGON</Text>
        <View style={styles.chips}>
          {DRAGONS.map((d) => {
            const on = dragonId === d.id;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDragonId(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Fight ${d.name}`}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>🐉 {d.name.replace('the Dragon of ', '')}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setDragonId(CUSTOM_DRAGON_ID)}
            accessibilityRole="button"
            accessibilityState={{ selected: dragonId === CUSTOM_DRAGON_ID }}
            accessibilityLabel="Name your own dragon"
            style={[styles.chip, dragonId === CUSTOM_DRAGON_ID && styles.chipOn]}
          >
            <Text style={[styles.chipText, dragonId === CUSTOM_DRAGON_ID && styles.chipTextOn]}>＋ Custom</Text>
          </Pressable>
        </View>
        {dragonId === CUSTOM_DRAGON_ID && (
          <TextInput
            value={dragonName}
            onChangeText={setDragonName}
            placeholder="Name your dragon (e.g. Sugar, Snooze, Self-Doubt)"
            placeholderTextColor={MUTED}
            style={styles.input}
            maxLength={32}
            accessibilityLabel="Custom dragon name"
          />
        )}
      </ScrollView>

      <Pressable
        onPress={() => void begin()}
        disabled={!canFight}
        accessibilityRole="button"
        accessibilityLabel="Begin battle"
        style={[styles.cta, !canFight && styles.ctaOff]}
      >
        <Text style={styles.ctaText}>⚔️ Begin battle</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  title: { ...typography.heading, color: INK },

  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },
  hint: { ...typography.caption, color: MUTED },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingVertical: spacing.lg },

  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  rowOn: { borderColor: VIOLET, backgroundColor: VIOLET_SOFT },
  rowIcon: { fontSize: 20 },
  rowTitle: { ...typography.body, color: INK, flex: 1, fontWeight: '600' },
  rowTitleOn: { color: VIOLET },
  check: { ...typography.title, color: MUTED, width: 24, textAlign: 'center' },
  checkOn: { color: VIOLET, fontWeight: '800' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.label, color: MUTED, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '700' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, alignSelf: 'flex-start', marginTop: spacing.xs },
  stepBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: CARD, borderWidth: 1, borderColor: TRACK, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { ...typography.heading, color: VIOLET },
  stepVal: { ...typography.title, color: INK, fontWeight: '700', minWidth: 80, textAlign: 'center' },

  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK, marginTop: spacing.xs },

  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
