import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, DragonSprite } from '@/components';
import { useRoomTour, useSpotlightTarget } from '@/components/spotlight';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { usePlan } from '@/state/PlanContext';
import { useBuckets } from '@/state/BucketsContext';
import { useGoals } from '@/state/GoalContext';
import { useProjects } from '@/state/ProjectsContext';
import { useBattles } from '@/state/BattlesContext';
import { useJournal } from '@/state/JournalContext';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { activitiesInBucket } from '@/lib/buckets';
import { goalHabits } from '@/lib/goal';
import { plannedOpen } from '@/lib/plan';
import { moodMeta } from '@/lib/journal';
import { habitContext } from '@/lib/habitContext';
import { CATEGORY_META, CATEGORY_COLOR } from '@/lib/categories';
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

// Techniques, reframed as fun "war gadgets" — icons are decorative; the tag and
// the science copy live in the `battle` namespace, keyed by technique id.
const GADGET_ICONS: Record<TechniqueId, string> = {
  pomodoro: '⚔️',
  deepwork: '🛡️',
  quick10: '🗡️',
  custom: '🎛️',
  flowtime: '🌊',
};

export function BattleSetupScreen({ route, navigation }: Props) {
  const { t } = useTranslation('battle');
  const { questId, questIds, bucketId, goalId } = route.params ?? {};

  const gadgetSub = (id: TechniqueId, mins: number): string => {
    const secs = workSeconds(getTechnique(id), mins);
    return secs === null ? t('gadgets.openEnded') : t('setup.minutes', { n: Math.round(secs / 60) });
  };
  const { quests, addQuest } = useGame();
  const { getPlan } = usePlan();
  const { assignments, buckets } = useBuckets();
  const { goals, membershipFor } = useGoals();
  const { projectActivityIds } = useProjects();
  const { lastTechniqueId, lastCustomMin, setTechnique, coins } = useBattles();
  const { entriesForDragon } = useJournal();
  const guardAbandon = useAbandonGuard();

  // First-visit helper tour + section highlight targets.
  useRoomTour('warRoom');
  const dragonTarget = useSpotlightTarget('war-dragon');
  const gadgetTarget = useSpotlightTarget('war-gadget');
  const missionsTarget = useSpotlightTarget('war-missions');

  const activeQuests = useMemo(() => quests.filter((q) => !q.completed), [quests]);

  const preselected = useMemo(() => {
    if (questIds && questIds.length > 0) return new Set(questIds);
    if (questId) return new Set([questId]);
    if (bucketId) return new Set(activitiesInBucket({ buckets, assignments }, bucketId));
    if (goalId) {
      const goal = goals.find((g) => g.id === goalId);
      return new Set(goal ? goalHabits(activeQuests, goal, membershipFor(goal.id), projectActivityIds).map((q) => q.id) : []);
    }
    return new Set(plannedOpen(quests, getPlan(dayKey(new Date()))).map((q) => q.id));
  }, [questId, questIds, bucketId, goalId, buckets, assignments, goals, membershipFor, projectActivityIds, activeQuests, quests, getPlan]);

  const [selected, setSelected] = useState<Set<string>>(preselected);
  const [techniqueId, setTechniqueId] = useState<TechniqueId>(lastTechniqueId ?? 'pomodoro');
  const [customMin, setCustomMin] = useState<number>(lastCustomMin ?? 20);
  const [dragonId, setDragonId] = useState<string>(DRAGONS[0]!.id);
  const [dragonName, setDragonName] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const resolvedDragon = getDragon(dragonId, dragonName);
  const resolvedDragonName = t('dragons:' + dragonId + '.name', { defaultValue: resolvedDragon.name });
  const reflections = entriesForDragon(dragonId);
  const latest = reflections[0];

  const selectedQuests = activeQuests.filter((q) => selected.has(q.id));
  const available = activeQuests.filter((q) => !selected.has(q.id));

  // Personalized, goal-driven context anchored on the first selected mission.
  const primary = selectedQuests[0];
  const ctx = primary ? habitContext(primary, goals) : null;

  const explainCoins = () =>
    Alert.alert(t('setup.coinsAlertTitle'), t('setup.coinsAlertBody', { coins }));

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

  const onClose = () => {
    if (
      guardAbandon({
        kind: 'setup-close',
        ctx: { selectedCount: selected.size },
        dragonId,
        ...(dragonId === CUSTOM_DRAGON_ID && dragonName.trim() ? { dragonName: dragonName.trim() } : {}),
        ...(primary ? { questId: primary.id } : {}),
        onProceed: () => navigation.goBack(),
      })
    )
      return;
    navigation.goBack();
  };

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

  // A reflection prompt personalized to THIS dragon and ALL the chosen activities
  // (not just the first) — so the question feels pointed and earned.
  const openReflect = () => {
    const titles = selectedQuests.map((q) => q.title);
    const activities = titles.length > 0 ? titles.join(', ') : t('setup.theseHabits');
    const prompt = t(`dragons:${dragonId}.reflect`, { activities, defaultValue: t('dragons:custom.reflect', { activities }) });
    const dragonWhy = t(`dragons:${dragonId}.reflectWhy`, { defaultValue: t('dragons:custom.reflectWhy') });
    const teaching = ctx?.teaching ? `${dragonWhy}\n\n${ctx.teaching}` : dragonWhy;
    navigation.navigate('JournalComposer', {
      dragonId,
      dragonName: resolvedDragonName,
      questIds: [...selected],
      prompt,
      teaching,
    });
  };

  const openCoaching = () => {
    const secs = workSeconds(getTechnique(techniqueId), customMin);
    navigation.navigate('CoachingEncounter', {
      dragonId,
      ...(dragonId === CUSTOM_DRAGON_ID && dragonName.trim() ? { dragonName: dragonName.trim() } : {}),
      ...(primary ? { questId: primary.id } : {}),
      ...(secs != null ? { minutesAvailable: Math.round(secs / 60) } : {}),
    });
  };

  return (
    <ScreenContainer backgroundColor={BG} keyboardAvoiding>
      <View style={styles.topbar}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('setup.close')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('setup.warRoom')}
        </Text>
        <Pressable onPress={explainCoins} style={styles.coinPill} accessibilityRole="button" accessibilityLabel={t('setup.coinsA11y', { coins })}>
          <Text style={styles.coinText}>{t('setup.coinsPill', { coins })}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 1 — Reflection on top (social post). */}
        <Pressable onPress={openReflect} accessibilityRole="button" accessibilityLabel={t('setup.reflectA11y')} style={[styles.reflectCard, shadow]}>
          <View style={styles.reflectHead}>
            <Text style={styles.reflectKicker}>{t('setup.reflectKicker')}</Text>
            {reflections.length > 0 && (
              <Pressable onPress={() => navigation.navigate('Journal', { dragonId })} accessibilityRole="button" accessibilityLabel={t('setup.pastReflectionsA11y', { count: reflections.length })} hitSlop={8}>
                <Text style={styles.reflectLink}>{t('setup.pastReflectionsLink', { n: reflections.length })}</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.reflectPromptStrong}>{ctx ? ctx.prompt : t('setup.defaultPrompt')}</Text>
          {ctx && <Text style={styles.reflectTeaching}>🧠 {ctx.teaching}</Text>}
          {ctx?.goalTitle && (
            <View style={styles.goalChip}>
              <Text style={styles.goalChipText}>🎯 {ctx.goalTitle}</Text>
            </View>
          )}
          {latest && (
            <Text style={styles.latestText} numberOfLines={1}>
              {t('setup.lastReflection', { emoji: moodMeta(latest.mood)?.emoji ?? '🗒️', text: latest.text || t('setup.reflectionSaved') })}
            </Text>
          )}
          <Text style={styles.reflectCta}>{latest ? t('setup.addAnotherReflection') : t('setup.journalStopping')}</Text>
        </Pressable>

        {/* Coach: critical-thinking questions + a matched tactic for this dragon. */}
        <Pressable onPress={openCoaching} accessibilityRole="button" accessibilityLabel={t('setup.confrontA11y', { name: resolvedDragonName })} style={styles.confrontBtn}>
          <Text style={styles.confrontText}>{t('setup.confrontCta')}</Text>
        </Pressable>

        {/* 2 — Choose your dragon. */}
        <View style={styles.sectionBlock} {...dragonTarget}>
          <Text style={styles.sectionLabel}>{t('setup.yourDragon')}</Text>
          <Text style={styles.sectionHint}>{t('setup.dragonHint')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {DRAGONS.map((d) => {
            const on = dragonId === d.id;
            return (
              <Pressable
                key={d.id}
                onPress={() => setDragonId(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('setup.fightDragonA11y', { name: t('dragons:' + d.id + '.name', { defaultValue: d.name }) })}
                style={[styles.dragonCard, on && styles.cardOn]}
              >
                <DragonSprite colorId={d.colorId} size={66} />
                <Text style={[styles.dragonCardName, on && styles.cardTextOn]} numberOfLines={1}>
                  {t('dragons:' + d.id + '.short', { defaultValue: d.name.replace('the Dragon of ', '') })}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setDragonId(CUSTOM_DRAGON_ID)}
            accessibilityRole="button"
            accessibilityState={{ selected: dragonId === CUSTOM_DRAGON_ID }}
            accessibilityLabel={t('setup.nameOwnDragonA11y')}
            style={[styles.dragonCard, dragonId === CUSTOM_DRAGON_ID && styles.cardOn]}
          >
            <Text style={styles.customDragonPlus}>＋</Text>
            <Text style={[styles.dragonCardName, dragonId === CUSTOM_DRAGON_ID && styles.cardTextOn]}>{t('setup.custom')}</Text>
          </Pressable>
        </ScrollView>
        {dragonId === CUSTOM_DRAGON_ID && (
          <TextInput
            value={dragonName}
            onChangeText={setDragonName}
            placeholder={t('setup.customDragonPlaceholder')}
            placeholderTextColor={MUTED}
            style={styles.input}
            maxLength={32}
            accessibilityLabel={t('setup.customDragonNameA11y')}
          />
        )}

        {/* 3 — Pick your gadget (technique). */}
        <View style={styles.sectionBlock} {...gadgetTarget}>
          <Text style={styles.sectionLabel}>{t('setup.yourWarGadget')}</Text>
          <Text style={styles.sectionHint}>{t('setup.gadgetHint')}</Text>
        </View>
        <View style={styles.gadgetGrid}>
          {TECHNIQUES.map((tech) => {
            const on = techniqueId === tech.id;
            return (
              <Pressable
                key={tech.id}
                onPress={() => setTechniqueId(tech.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('setup.gadgetA11y', { tag: t('gadgets.' + tech.id + '.tag'), technique: t('techniques:' + tech.id + '.name', { defaultValue: tech.name }), duration: gadgetSub(tech.id, customMin) })}
                style={[styles.gadgetCard, on && styles.cardOn]}
              >
                <Text style={styles.gadgetIcon}>{GADGET_ICONS[tech.id]}</Text>
                <Text style={[styles.gadgetTag, on && styles.cardTextOn]}>{t('gadgets.' + tech.id + '.tag')}</Text>
                <Text style={styles.gadgetSub}>{gadgetSub(tech.id, customMin)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.gadgetWhy}>🧠 {t('gadgets.' + techniqueId + '.why')}</Text>
        {techniqueId === 'custom' && (
          <View style={styles.stepper}>
            <Pressable onPress={() => setCustomMin((m) => clampCustomMinutes(m - 5))} accessibilityRole="button" accessibilityLabel={t('setup.decreaseMinutesA11y')} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>–</Text>
            </Pressable>
            <Text style={styles.stepVal}>{t('setup.minutes', { n: clampCustomMinutes(customMin) })}</Text>
            <Pressable onPress={() => setCustomMin((m) => clampCustomMinutes(m + 5))} accessibilityRole="button" accessibilityLabel={t('setup.increaseMinutesA11y')} style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        )}

        {/* 4 — Missions (habits), compact: chips + add. */}
        <View style={styles.sectionBlock} {...missionsTarget}>
          <View style={styles.missionHead}>
            <Text style={styles.sectionLabel}>{t('setup.missionsLabel', { n: selected.size })}</Text>
            <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={t('setup.addMissionsA11y')} hitSlop={8}>
              <Text style={styles.addMissions}>{t('setup.addShort')}</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionHint}>{t('setup.missionsHint')}</Text>
        </View>
        {selectedQuests.length === 0 ? (
          <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={styles.emptyMissions}>
            <Text style={styles.emptyMissionsText}>{t('setup.emptyMissions')}</Text>
          </Pressable>
        ) : (
          <View style={styles.missionChips}>
            {selectedQuests.map((q) => (
              <Pressable key={q.id} onPress={() => remove(q.id)} accessibilityRole="button" accessibilityLabel={t('setup.removeMissionA11y', { title: q.title })} style={[styles.missionChip, { borderColor: CATEGORY_COLOR[q.category] }]}>
                <View style={[styles.missionDot, { backgroundColor: CATEGORY_COLOR[q.category] }]} />
                <Text style={styles.missionChipText} numberOfLines={1}>
                  {CATEGORY_META[q.category].icon} {q.title}
                </Text>
                <Text style={styles.missionChipX}>✕</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Brain Break + Dragon Den now live inside the battle (after Begin battle). */}
      <Pressable
        onPress={() => void begin()}
        disabled={!canFight}
        accessibilityRole="button"
        accessibilityLabel={t('setup.beginBattleA11y')}
        style={[styles.cta, !canFight && styles.ctaOff]}
      >
        <Text style={styles.ctaText}>{t('setup.beginBattle')}</Text>
      </Pressable>

      {/* Mission picker — a clean overlay, not an always-on crowded list. */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t('setup.addMissionsTitle')}</Text>
              <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel={t('setup.doneA11y')} hitSlop={12}>
                <Text style={styles.sheetDone}>{t('setup.done')}</Text>
              </Pressable>
            </View>
            <View style={styles.addRow}>
              <TextInput
                value={customActivity}
                onChangeText={setCustomActivity}
                placeholder={t('setup.customActivityPlaceholder')}
                placeholderTextColor={MUTED}
                style={styles.addInput}
                onSubmitEditing={() => void addCustomActivity()}
                returnKeyType="done"
                maxLength={60}
                accessibilityLabel={t('setup.addCustomActivityA11y')}
              />
              <Pressable onPress={() => void addCustomActivity()} disabled={customActivity.trim().length === 0} accessibilityRole="button" accessibilityLabel={t('setup.addActivityA11y')} style={styles.addBtn}>
                <Text style={[styles.addBtnText, customActivity.trim().length === 0 && styles.addBtnOff]}>{t('setup.add')}</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {available.length === 0 ? (
                <Text style={styles.sheetEmpty}>{t('setup.allIn')}</Text>
              ) : (
                available.map((q) => (
                  <Pressable key={q.id} onPress={() => add(q.id)} accessibilityRole="button" accessibilityLabel={t('setup.addMissionA11y', { title: q.title })} style={styles.sheetRow}>
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
  sectionBlock: { gap: 4 },
  sectionHint: { ...typography.caption, color: MUTED },

  // Reflect card
  reflectCard: { backgroundColor: CARD, borderRadius: 20, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: '#E2DBFB' },
  reflectHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reflectKicker: { ...typography.label, color: VIOLET, fontWeight: '800', letterSpacing: 1 },
  reflectLink: { ...typography.label, color: VIOLET, fontWeight: '700' },
  reflectPromptStrong: { ...typography.title, color: INK, fontWeight: '800' },
  reflectTeaching: { ...typography.body, color: MUTED },
  goalChip: { alignSelf: 'flex-start', backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4 },
  goalChipText: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  latestText: { ...typography.caption, color: MUTED },
  reflectCta: { ...typography.label, color: VIOLET, fontWeight: '700' },

  confrontBtn: { backgroundColor: VIOLET_SOFT, borderRadius: 16, paddingVertical: spacing.md, paddingHorizontal: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#E2DBFB' },
  confrontText: { ...typography.label, color: VIOLET, fontWeight: '800' },

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
  gadgetWhy: { ...typography.caption, color: MUTED },
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
  missionDot: { width: 9, height: 9, borderRadius: 999 },
  missionChipText: { ...typography.label, color: VIOLET, fontWeight: '700', flexShrink: 1 },
  missionChipX: { ...typography.caption, color: VIOLET, fontWeight: '800' },

  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },

  prepRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  prepBtn: { flex: 1, backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#E2DBFB' },
  prepBtnDone: { backgroundColor: '#EAFBF6', borderColor: '#16C8A8' },
  prepText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  prepTextDone: { color: '#0A6E5C' },
  denBtn: { backgroundColor: CARD, borderRadius: 999, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: TRACK },
  denText: { ...typography.label, color: MUTED, fontWeight: '800' },

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
