import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, DragonSprite } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useBuckets } from '@/state/BucketsContext';
import { useGoals } from '@/state/GoalContext';
import { useBattles } from '@/state/BattlesContext';
import { useJournal } from '@/state/JournalContext';
import { activitiesInBucket } from '@/lib/buckets';
import { goalHabits } from '@/lib/goal';
import { plannedOpen } from '@/lib/plan';
import { moodMeta } from '@/lib/journal';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { TECHNIQUES, clampCustomMinutes, workSeconds, getTechnique, type TechniqueId } from '@/lib/timeTechniques';
import { DRAGONS, CUSTOM_DRAGON_ID, getDragon } from '@/data/dragons';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BattleSetup'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const shadow = {
  shadowColor: '#1B1B2A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 3,
};

// Techniques, reframed as fun "war gadgets".
const GADGETS: Record<TechniqueId, { icon: string; tag: string }> = {
  pomodoro: { icon: '⚔️', tag: 'Sprint Blade' },
  deepwork: { icon: '🛡️', tag: 'Siege Shield' },
  quick10: { icon: '🗡️', tag: 'Quick Strike' },
  custom: { icon: '🎛️', tag: 'Custom Rig' },
  flowtime: { icon: '🌊', tag: 'Flow Saber' },
};

function gadgetSub(id: TechniqueId, customMin: number): string {
  const secs = workSeconds(getTechnique(id), customMin);
  return secs === null ? 'open-ended' : `${Math.round(secs / 60)} min`;
}

export function BattleSetupScreen({ route, navigation }: Props) {
  const { questId, bucketId, goalId } = route.params ?? {};
  const { quests, addQuest } = useGame();
  const { getPlan } = usePlan();
  const { assignments, buckets } = useBuckets();
  const { goals } = useGoals();
  const { lastTechniqueId, lastCustomMin, setTechnique, coins } = useBattles();
  const { entriesForDragon } = useJournal();

  const activeQuests = useMemo(() => quests.filter((q) => !q.completed), [quests]);

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
  const [customActivity, setCustomActivity] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const resolvedDragon = getDragon(dragonId, dragonName);
  const reflections = entriesForDragon(dragonId);
  const latest = reflections[0];

  const selectedQuests = activeQuests.filter((q) => selected.has(q.id));
  const available = activeQuests.filter((q) => !selected.has(q.id));

  const add = (id: string) => setSelected((prev) => new Set(prev).add(id));
  const remove = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const addCustomActivity = async () => {
    const title = customActivity.trim();
    if (title.length === 0) return;
    const quest = await addQuest({ title, category: 'health', difficulty: 'easy' });
    if (quest) add(quest.id);
    setCustomActivity('');
  };

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

  const openReflect = () =>
    navigation.navigate('JournalComposer', { dragonId, dragonName: resolvedDragon.name, questIds: [...selected] });

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          War room
        </Text>
        <View style={styles.coinPill} accessibilityLabel={`${coins} coins`}>
          <Text style={styles.coinText}>🪙 {coins}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 1 — Reflection on top (social post). */}
        <Pressable onPress={openReflect} accessibilityRole="button" accessibilityLabel="Reflect on your dragon" style={[styles.reflectCard, shadow]}>
          <View style={styles.reflectHead}>
            <Text style={styles.reflectKicker}>📓 REFLECT FIRST</Text>
            {reflections.length > 0 && (
              <Pressable onPress={() => navigation.navigate('Journal', { dragonId })} accessibilityRole="button" accessibilityLabel={`View ${reflections.length} past reflections`} hitSlop={8}>
                <Text style={styles.reflectLink}>{reflections.length} past ›</Text>
              </Pressable>
            )}
          </View>
          {latest ? (
            <View style={styles.latestWrap}>
              <Text style={styles.latestText} numberOfLines={2}>
                {moodMeta(latest.mood)?.emoji ?? '🗒️'} {latest.text || 'Reflection saved'}
              </Text>
              <Text style={styles.reflectCta}>Add another reflection ›</Text>
            </View>
          ) : (
            <View style={styles.latestWrap}>
              <Text style={styles.reflectPrompt}>What’s stopping you from this? Name the dragon — text, mood, a photo.</Text>
              <Text style={styles.reflectCta}>Journal what’s stopping you ›</Text>
            </View>
          )}
        </Pressable>

        {/* 2 — Choose your dragon. */}
        <Text style={styles.sectionLabel}>YOUR DRAGON</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {DRAGONS.map((d) => {
            const on = dragonId === d.id;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDragonId(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Fight ${d.name}`}
                style={[styles.dragonCard, on && styles.cardOn]}
              >
                <DragonSprite colorId={d.colorId} size={66} />
                <Text style={[styles.dragonCardName, on && styles.cardTextOn]} numberOfLines={1}>
                  {d.name.replace('the Dragon of ', '')}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setDragonId(CUSTOM_DRAGON_ID)}
            accessibilityRole="button"
            accessibilityState={{ selected: dragonId === CUSTOM_DRAGON_ID }}
            accessibilityLabel="Name your own dragon"
            style={[styles.dragonCard, dragonId === CUSTOM_DRAGON_ID && styles.cardOn]}
          >
            <Text style={styles.customDragonPlus}>＋</Text>
            <Text style={[styles.dragonCardName, dragonId === CUSTOM_DRAGON_ID && styles.cardTextOn]}>Custom</Text>
          </Pressable>
        </ScrollView>
        {dragonId === CUSTOM_DRAGON_ID && (
          <TextInput
            value={dragonName}
            onChangeText={setDragonName}
            placeholder="Name your dragon (Sugar, Snooze, Self-Doubt…)"
            placeholderTextColor={MUTED}
            style={styles.input}
            maxLength={32}
            accessibilityLabel="Custom dragon name"
          />
        )}

        {/* 3 — Pick your gadget (technique). */}
        <Text style={styles.sectionLabel}>YOUR WAR GADGET</Text>
        <View style={styles.gadgetGrid}>
          {TECHNIQUES.map((t) => {
            const on = techniqueId === t.id;
            const g = GADGETS[t.id];
            return (
              <Pressable
                key={t.id}
                onPress={() => setTechniqueId(t.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${g.tag}, ${t.name}, ${gadgetSub(t.id, customMin)}`}
                style={[styles.gadgetCard, on && styles.cardOn]}
              >
                <Text style={styles.gadgetIcon}>{g.icon}</Text>
                <Text style={[styles.gadgetTag, on && styles.cardTextOn]}>{g.tag}</Text>
                <Text style={styles.gadgetSub}>{gadgetSub(t.id, customMin)}</Text>
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

        {/* 4 — Missions (habits), compact: chips + add. */}
        <View style={styles.missionHead}>
          <Text style={styles.sectionLabel}>MISSIONS ({selected.size})</Text>
          <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel="Add missions" hitSlop={8}>
            <Text style={styles.addMissions}>＋ Add</Text>
          </Pressable>
        </View>
        {selectedQuests.length === 0 ? (
          <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={styles.emptyMissions}>
            <Text style={styles.emptyMissionsText}>Pick the habits for this block ›</Text>
          </Pressable>
        ) : (
          <View style={styles.missionChips}>
            {selectedQuests.map((q) => (
              <Pressable key={q.id} onPress={() => remove(q.id)} accessibilityRole="button" accessibilityLabel={`Remove ${q.title}`} style={styles.missionChip}>
                <Text style={styles.missionChipText} numberOfLines={1}>
                  {CATEGORY_META[q.category].icon} {q.title}
                </Text>
                <Text style={styles.missionChipX}>✕</Text>
              </Pressable>
            ))}
          </View>
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

      {/* Mission picker — a clean overlay, not an always-on crowded list. */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Add missions</Text>
              <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Done" hitSlop={12}>
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.addRow}>
              <TextInput
                value={customActivity}
                onChangeText={setCustomActivity}
                placeholder="＋ Type a custom one (e.g. boiled eggs)"
                placeholderTextColor={MUTED}
                style={styles.addInput}
                onSubmitEditing={() => void addCustomActivity()}
                returnKeyType="done"
                maxLength={60}
                accessibilityLabel="Add a custom activity"
              />
              <Pressable onPress={() => void addCustomActivity()} disabled={customActivity.trim().length === 0} accessibilityRole="button" accessibilityLabel="Add activity" style={styles.addBtn}>
                <Text style={[styles.addBtnText, customActivity.trim().length === 0 && styles.addBtnOff]}>Add</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent} showsVerticalScrollIndicator={false}>
              {available.length === 0 ? (
                <Text style={styles.sheetEmpty}>Everything’s in. Type a custom one above.</Text>
              ) : (
                available.map((q) => (
                  <Pressable key={q.id} onPress={() => add(q.id)} accessibilityRole="button" accessibilityLabel={`Add ${q.title}`} style={styles.sheetRow}>
                    <Text style={styles.sheetRowIcon}>{CATEGORY_META[q.category].icon}</Text>
                    <Text style={styles.sheetRowTitle} numberOfLines={1}>
                      {q.title}
                    </Text>
                    <Text style={styles.sheetRowAdd}>＋</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK },
  coinPill: { backgroundColor: '#FFF6E6', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: '#F4D793' },
  coinText: { ...typography.label, color: '#B8860B', fontWeight: '800' },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2 },

  // Reflect card
  reflectCard: { backgroundColor: CARD, borderRadius: 20, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: '#E2DBFB' },
  reflectHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reflectKicker: { ...typography.label, color: VIOLET, fontWeight: '800', letterSpacing: 1 },
  reflectLink: { ...typography.label, color: VIOLET, fontWeight: '700' },
  latestWrap: { gap: 4 },
  latestText: { ...typography.body, color: INK },
  reflectPrompt: { ...typography.body, color: MUTED },
  reflectCta: { ...typography.label, color: VIOLET, fontWeight: '700' },

  // Dragon carousel
  carousel: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.md },
  dragonCard: { width: 104, backgroundColor: CARD, borderRadius: 18, paddingVertical: spacing.sm, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: TRACK },
  dragonCardName: { ...typography.caption, color: INK, fontWeight: '700', textTransform: 'capitalize' },
  customDragonPlus: { fontSize: 40, color: VIOLET, height: 66, lineHeight: 66, fontWeight: '300' },
  cardOn: { borderColor: VIOLET, backgroundColor: VIOLET_SOFT, ...shadow },
  cardTextOn: { color: VIOLET },

  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK },

  // Gadgets
  gadgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gadgetCard: { width: '31%', backgroundColor: CARD, borderRadius: 16, paddingVertical: spacing.md, alignItems: 'center', gap: 2, borderWidth: 2, borderColor: TRACK },
  gadgetIcon: { fontSize: 22 },
  gadgetTag: { ...typography.caption, color: INK, fontWeight: '800', textAlign: 'center' },
  gadgetSub: { ...typography.caption, color: MUTED, fontSize: 11 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, alignSelf: 'flex-start' },
  stepBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: CARD, borderWidth: 1, borderColor: TRACK, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { ...typography.heading, color: VIOLET },
  stepVal: { ...typography.title, color: INK, fontWeight: '700', minWidth: 80, textAlign: 'center' },

  // Missions
  missionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addMissions: { ...typography.label, color: VIOLET, fontWeight: '800' },
  emptyMissions: { backgroundColor: CARD, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: TRACK, borderStyle: 'dashed' },
  emptyMissionsText: { ...typography.body, color: MUTED },
  missionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  missionChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#E2DBFB', maxWidth: '100%' },
  missionChipText: { ...typography.label, color: VIOLET, fontWeight: '700', flexShrink: 1 },
  missionChipX: { ...typography.caption, color: VIOLET, fontWeight: '800' },

  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },

  // Picker sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: '80%', gap: spacing.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...typography.heading, color: INK },
  sheetDone: { ...typography.label, color: VIOLET, fontWeight: '800' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addInput: { ...typography.body, color: INK, flex: 1, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addBtnText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  addBtnOff: { color: MUTED, opacity: 0.5 },
  sheetList: { alignSelf: 'stretch' },
  sheetListContent: { gap: spacing.sm, paddingBottom: spacing.md },
  sheetEmpty: { ...typography.body, color: MUTED, textAlign: 'center', paddingVertical: spacing.lg },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  sheetRowIcon: { fontSize: 18 },
  sheetRowTitle: { ...typography.body, color: INK, flex: 1, fontWeight: '600' },
  sheetRowAdd: { fontSize: 20, color: VIOLET, fontWeight: '800' },
});
