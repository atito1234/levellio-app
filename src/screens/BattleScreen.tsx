import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, AnimatedHero, DragonSprite, ConfettiBurst, JourneyScene, DialTimer, ActivityPickerDeck } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBattles } from '@/state/BattlesContext';
import { useMilestones } from '@/state/MilestonesContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { useActivityLog } from '@/state/useActivityLog';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getCelebrationTimings } from '@/lib/celebration';
import { battleStateAt } from '@/lib/battle';
import { getTechnique } from '@/lib/timeTechniques';
import { getDragon } from '@/data/dragons';
import { sessionsOf } from '@/lib/analytics';
import { activityJourney, HABIT_DAYS } from '@/lib/journey';
import { sceneForCategory } from '@/lib/journeyScene';
import { CATEGORY_COLOR, CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { activityTiming, formatClock, isVerifiedDuration } from '@/lib/activityTimer';
import { ACTIVITY_VERIFICATION_ENABLED, FOCUS_LOCK_ENABLED } from '@/config/features';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { RootStackParamList } from '@/navigation/types';
import type { Quest } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Battle'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';
const TRACK = '#E8E6E0';

interface VictoryResult {
  completed: number;
  selected: number;
  totalXp: number;
  coins: number;
  /** True when a pre-battle prep rite was performed (bonus coins). */
  prepared: boolean;
}

/** Coins awarded for a victory: a per-habit bounty + a dragon bounty. */
function coinsFor(completed: number): number {
  return completed * 10 + 25;
}

export function BattleScreen({ route, navigation }: Props) {
  const { t } = useTranslation('battle');
  const { questIds, techniqueId, customMin, dragonId, dragonName } = route.params;
  const { quests, character } = useGame();
  const { recordVictory, preparedRite, perDragonStreak, perDragon } = useBattles();
  const { recordMilestones } = useMilestones();
  const { events } = useActivityLog();
  const PREP_BONUS = 25;
  const complete = useCompleteActivity();
  const guardAbandon = useAbandonGuard();
  const reduced = useReducedMotion();
  const timings = getCelebrationTimings(reduced);

  const technique = getTechnique(techniqueId);
  const dragon = useMemo(() => getDragon(dragonId, dragonName), [dragonId, dragonName]);
  const dragonDisplayName = t('dragons:' + dragon.id + '.name', { defaultValue: dragon.name });
  const dragonTaunt = t('dragons:' + dragon.id + '.taunt', { defaultValue: dragon.taunt });
  const dragonVictory = t('dragons:' + dragon.id + '.victory', { defaultValue: dragon.victory });
  const accent = dragon.colorId === 'teal' ? TEAL : VIOLET;
  // Choose one OR many activities to fight for under this one dragon — each with
  // its OWN duration. Selection + per-activity minutes both live here (seeded from
  // the launch bundle), so the user can add/drop activities and set each time.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(questIds));
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const getDur = useCallback((q: Quest) => durations[q.id] ?? activityTiming(q).minutes, [durations]);
  const setDuration = useCallback((id: string, m: number) => setDurations((p) => ({ ...p, [id]: m })), []);
  const toggleSelected = useCallback(
    (id: string) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }),
    [],
  );
  const activeQuests = useMemo(() => quests.filter((q) => selectedIds.has(q.id)), [quests, selectedIds]);
  // Total session = the SUM of each chosen activity's own time (min 1 minute).
  const totalSec = useMemo(
    () => Math.max(60, activeQuests.reduce((acc, q) => acc + getDur(q), 0) * 60),
    [activeQuests, getDur],
  );

  // The primary habit's "from repetition to habit" journey drives the victory scene.
  const sessions = useMemo(() => sessionsOf(events), [events]);
  const primaryJourney = useMemo(() => {
    const primary = activeQuests[0];
    return primary ? activityJourney(sessions, primary.id, primary.title, dayKey(new Date())) : null;
  }, [activeQuests, sessions]);
  const journeyScene = useMemo(() => sceneForCategory(activeQuests[0]?.category), [activeQuests]);

  // Seed each activity's dial with its own default time, so the chooser shows the
  // real per-activity duration (the user can then spin any of them up/down).
  useEffect(() => {
    setDurations((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const q of quests) {
        if (next[q.id] == null) {
          next[q.id] = activityTiming(q).minutes;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [quests]);

  // "Scroll for more" hint: shown while the activity chooser sits below the fold,
  // so users know to scroll down to pick what they're fighting for.
  const scrollRef = useRef<ScrollView>(null);
  const [scrollHint, setScrollHint] = useState(false);
  const viewH = useRef(0);
  const contentH = useRef(0);
  const lastY = useRef(0);
  const refreshScrollHint = useCallback(() => {
    const overflow = contentH.current - viewH.current;
    setScrollHint(overflow > 24 && lastY.current < overflow - 24);
  }, []);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VictoryResult | null>(null);
  const [locked, setLocked] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wonRef = useRef(false);
  const allowLeave = useRef(false);
  // Quests already credited this session (so win + leave never double-complete).
  const completedRef = useRef<Set<string>>(new Set());

  const state = battleStateAt(totalSec, elapsed);
  const won = result !== null;
  const lockActive = FOCUS_LOCK_ENABLED && locked && !won;

  const stop = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    void deactivateKeepAwake();
  }, []);
  useEffect(() => stop, [stop]);

  // Idle dragon sway while the battle rages (decorative; off for reduced motion).
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running || reduced) {
      sway.stopAnimation();
      sway.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [running, reduced, sway]);
  const swayX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  // Complete every activity whose OWN timer the focus time has covered (each
  // activity has its own duration). Records what the user actually performed —
  // used by both victory (full elapse covers all) and an early leave (partial).
  const completeCovered = useCallback(async (): Promise<{ completed: number; totalXp: number }> => {
    const method = technique.countsUp ? 'timer' : 'pomodoro';
    let completed = 0;
    let totalXp = 0;
    for (const q of activeQuests) {
      if (completedRef.current.has(q.id)) continue;
      const reqSec = getDur(q) * 60; // this activity's OWN chosen duration
      if (elapsed < reqSec) continue; // not focused long enough to count it
      completedRef.current.add(q.id);
      const verified = ACTIVITY_VERIFICATION_ENABLED && isVerifiedDuration(elapsed, reqSec);
      const reward = await complete(q, { method, durationSec: reqSec, ...(verified ? { verified: true } : {}) });
      if (reward) {
        completed += 1;
        totalXp += reward.totalXp;
      }
    }
    return { completed, totalXp };
  }, [technique.countsUp, activeQuests, getDur, elapsed, complete]);

  // Leaving early still records the activities the focus time already covered.
  const creditPerformed = useCallback(async () => {
    await completeCovered();
  }, [completeCovered]);

  const winBattle = useCallback(async () => {
    if (wonRef.current) return;
    wonRef.current = true;
    stop();
    setRunning(false);
    try {
      Vibration.vibrate(reduced ? 30 : [0, 40, 60, 120]);
    } catch {
      /* vibration unavailable — ignore */
    }
    const { completed, totalXp } = await completeCovered();
    const prepared = preparedRite !== null;
    const coins = coinsFor(completed) + (prepared ? PREP_BONUS : 0);
    await recordVictory(dragon.id, coins); // consumes the prep rite + advances the dragon streak
    // Record the slaying as a celebrated milestone (shows over any screen + in the
    // profile's milestones). The id is per-dragon-per-count so each slaying lands once.
    const count = (perDragon[dragon.id] ?? 0) + 1;
    await recordMilestones([
      {
        id: `dragon-${dragon.id}-${count}`,
        kind: 'dragon',
        emoji: '⚔️',
        label: t('milestonesContent:dragonSlain', { dragon: dragonDisplayName }),
        earnedAt: Date.now(),
        i18n: { labelKey: 'dragonSlain', labelParams: { dragon: dragonDisplayName } },
      },
    ]);
    setResult({ completed, selected: activeQuests.length, totalXp, coins, prepared });
  }, [stop, reduced, completeCovered, activeQuests.length, recordVictory, dragon.id, preparedRite, perDragon, recordMilestones, t, dragonDisplayName]);

  // After a win, dismiss the battle (a fullScreenModal) once. goBack returns to
  // the launching screen; the slaying milestone celebrates via the global overlay
  // no matter where we land. (navigate('Main') here left the battle mounted in the
  // background and broke the back stack — the "cannot go back" / stuck popup bug.)
  const wentHomeRef = useRef(false);
  const goHome = useCallback(() => {
    if (wentHomeRef.current) return;
    wentHomeRef.current = true;
    navigation.goBack();
  }, [navigation]);
  useEffect(() => {
    if (!result) return;
    const id = setTimeout(goHome, reduced ? 1400 : 3200);
    return () => clearTimeout(id);
  }, [result, reduced, goHome]);

  // Auto-slay when a timed block fully elapses.
  useEffect(() => {
    if (running && totalSec !== null && elapsed >= totalSec) void winBattle();
  }, [running, totalSec, elapsed, winBattle]);

  const start = useCallback(() => {
    if (running || won) return;
    setRunning(true);
    void activateKeepAwakeAsync();
    tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [running, won]);

  const pause = useCallback(() => {
    stop();
    setRunning(false);
  }, [stop]);

  if (quests.length === 0) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <View style={styles.center}>
          <Text style={styles.sub}>{t('battle.noHabits')}</Text>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>{t('battle.goBack')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const leaveNow = useCallback(() => {
    allowLeave.current = true;
    setLocked(false);
    navigation.goBack();
  }, [navigation]);

  // Locked attempt-to-leave routes through the "end early?" intervention.
  const attemptLeave = useCallback(() => {
    const intervened = guardAbandon({
      kind: 'activity-locked-exit',
      ctx: { focusLockedRunning: true },
      dragonId,
      ...(dragonName ? { dragonName } : {}),
      ...(activeQuests[0] ? { questId: activeQuests[0].id } : {}),
      onProceed: leaveNow,
    });
    if (!intervened) leaveNow();
  }, [guardAbandon, dragonId, dragonName, activeQuests, leaveNow]);

  // Frictionless exit: close the battle cleanly (dismiss the modal) — never
  // replace/navigate across presentations, which left a stuck dragon screen.
  // Credit any activities the focus time already covered before leaving.
  const backToActivity = useCallback(() => {
    allowLeave.current = true;
    setLocked(false);
    stop();
    void creditPerformed();
    navigation.goBack();
  }, [navigation, stop, creditPerformed]);

  const onExit = () => {
    if (lockActive) {
      attemptLeave();
      return;
    }
    backToActivity();
  };

  // Open the Brain Break mind-game (over the battle) — returns here on close.
  const openBrainBreak = () =>
    navigation.navigate('PrepareRite', {
      dragonId,
      ...(dragonName ? { dragonName } : {}),
      ...(activeQuests[0] ? { category: activeQuests[0].category } : {}),
    });

  // Block swipe / back / hardware-back while locked.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !lockActive });
  }, [lockActive, navigation]);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!lockActive || allowLeave.current) return;
      e.preventDefault();
      attemptLeave();
    });
    return unsub;
  }, [navigation, lockActive, attemptLeave]);
  useEffect(() => {
    if (!lockActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      attemptLeave();
      return true;
    });
    return () => sub.remove();
  }, [lockActive, attemptLeave]);

  const clock = totalSec === null ? formatClock(elapsed) : formatClock(state.remainingSec ?? 0);
  // With one activity, spinning the big dial sets its time; with many, each time is
  // set per-activity in the chooser and the big dial just shows the total countdown.
  const single = activeQuests.length === 1 ? activeQuests[0] : null;

  return (
    <ScreenContainer backgroundColor={BG}>
      {won && timings.confetti && <ConfettiBurst />}
      <View style={styles.topbar}>
        {!won && (
          <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel={t('battle.backToActivityA11y')} hitSlop={12}>
            <Text style={styles.retreat}>{t('battle.backToActivity')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.stageWrap}>
      <ScrollView
        ref={scrollRef}
        style={styles.stage}
        contentContainerStyle={styles.stageContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          lastY.current = e.nativeEvent.contentOffset.y;
          refreshScrollHint();
        }}
        onLayout={(e) => {
          viewH.current = e.nativeEvent.layout.height;
          refreshScrollHint();
        }}
        onContentSizeChange={(_w, h) => {
          contentH.current = h;
          refreshScrollHint();
        }}
      >
        {won ? (
          <>
            <DragonSprite colorId={dragon.colorId} slain size={150} />
            <Text style={[styles.victory, { color: GOLD }]} accessibilityRole="header" accessibilityLiveRegion="polite">
              {t('battle.victory')}
            </Text>
            <Text style={styles.victoryLine}>{dragonVictory}</Text>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {t('battle.summary', {
                  count: result!.selected,
                  completed: result!.completed,
                  selected: result!.selected,
                  xp: result!.totalXp > 0 ? t('battle.summaryXp', { xp: result!.totalXp }) : '',
                })}
              </Text>
              <Text style={styles.summaryCoins}>{t('battle.summaryCoins', { coins: result!.coins })}</Text>
              {result!.prepared && <Text style={styles.summaryPrepared}>{t('battle.preparedBadge')}</Text>}
            </View>

            {/* The win as a step toward an automatic habit — climb / path forward. */}
            {primaryJourney && (
              <View style={styles.journey}>
                <JourneyScene
                  scene={journeyScene}
                  progressPct={primaryJourney.progressPct}
                  streak={perDragonStreak[dragon.id]?.streak ?? 0}
                  graduated={primaryJourney.graduated}
                />
                <Text style={styles.journeyCaption}>
                  {primaryJourney.graduated
                    ? t('battle.journey.graduated')
                    : primaryJourney.solidified
                      ? t('battle.journey.solidified')
                      : t('battle.journey.caption', { day: primaryJourney.currentStreak, total: HABIT_DAYS })}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.kicker}>{running ? t('battle.inBattle') : t('battle.faceYourDragon')}</Text>
            <Animated.View style={{ transform: [{ translateX: swayX }] }}>
              <DragonSprite colorId={dragon.colorId} healthPct={state.dragonHealthPct} size={150} />
            </Animated.View>
            <Text style={styles.dragonName}>{dragonDisplayName}</Text>
            <Text style={styles.taunt}>{dragonTaunt}</Text>

            <View
              style={styles.healthTrack}
              accessibilityLabel={t('battle.dragonHealthA11y', { pct: Math.round(state.dragonHealthPct) })}
            >
              <View style={[styles.healthFill, { width: `${Math.max(2, state.dragonHealthPct)}%`, backgroundColor: accent }]} />
            </View>

            <View style={styles.heroRow}>
              <AnimatedHero
                presentation={character?.presentation ?? 'neutral'}
                tier={character?.tier ?? 'novice'}
                kitId={character?.kitId}
                size={64}
                animate={running}
              />
            </View>

            {/* Spin the ring (clockwise) to set/adjust your focus time — even mid-battle. */}
            <View style={styles.dialWrap} accessibilityLabel={t('battle.clockRemainingA11y', { clock })}>
              <DialTimer
                minutes={single ? getDur(single) : Math.round(totalSec / 60)}
                onChange={(m) => single && setDuration(single.id, m)}
                disabled={!single}
                color={accent}
                size={200}
                centerLabel={clock}
                sublabel={single ? t('battle.dialHint') : t('battle.perActivityHint')}
                {...(running ? { progress: state.dragonHealthPct / 100 } : {})}
              />
            </View>

            {/* Which activities you're fighting for — choose one or many, each with its
                own time. Chips are removable; "＋" opens the chooser (with per-activity dials). */}
            <View style={styles.actvList}>
              <Text style={styles.actvHead}>{t('battle.fightingFor')}</Text>
              <View style={styles.chipWrap}>
                {activeQuests.map((q) => {
                  const covered = completedRef.current.has(q.id) || elapsed >= getDur(q) * 60;
                  return (
                    <Pressable key={q.id} onPress={() => toggleSelected(q.id)} accessibilityRole="button" style={[styles.chip, { borderColor: CATEGORY_COLOR[q.category] }]}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {covered ? '✅ ' : ''}{CATEGORY_META[q.category].icon} {q.title} · {t('battle.minShort', { count: getDur(q) })}
                      </Text>
                      <Text style={styles.chipX}>✕</Text>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={styles.addChip}>
                  <Text style={styles.addChipText}>＋ {t('battle.chooseActivities')}</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {!won && scrollHint && (
        <Pressable
          onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
          accessibilityRole="button"
          accessibilityLabel={t('battle.scrollForActivitiesA11y')}
          style={styles.scrollHintWrap}
        >
          <View style={styles.scrollHintPill}>
            <Text style={styles.scrollHintText}>{t('battle.scrollForActivities')}</Text>
            <Text style={styles.scrollHintChevron}>⌄</Text>
          </View>
        </Pressable>
      )}
      </View>

      {won ? (
        <Pressable onPress={goHome} accessibilityRole="button" accessibilityLabel={t('battle.returnHome')} style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <Text style={styles.primaryText}>{t('battle.returnHome')}</Text>
        </Pressable>
      ) : (
        <View style={styles.controls}>
          <Pressable
            onPress={running ? pause : start}
            disabled={activeQuests.length === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: activeQuests.length === 0 }}
            accessibilityLabel={running ? t('battle.pauseA11y') : elapsed > 0 ? t('battle.resumeA11y') : t('battle.startBattleA11y')}
            style={[styles.primaryBtn, { backgroundColor: accent }, activeQuests.length === 0 && styles.primaryBtnOff]}
          >
            <Text style={styles.primaryText}>{running ? t('battle.pause') : elapsed > 0 ? t('battle.resume') : t('battle.start')}</Text>
          </Pressable>
          {elapsed > 0 && !lockActive && (
            <Pressable
              onPress={() => void winBattle()}
              accessibilityRole="button"
              accessibilityLabel={t('battle.finishA11y')}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>{t('battle.finish')}</Text>
            </Pressable>
          )}
          {FOCUS_LOCK_ENABLED && (
            lockActive ? (
              <Pressable onPress={attemptLeave} accessibilityRole="button" accessibilityLabel={t('battle.endEarlyA11y')} style={styles.lockRow}>
                <Text style={styles.lockedText}>{t('battle.lockedEndEarly')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setLocked(true)} accessibilityRole="button" accessibilityLabel={t('battle.lockMeIn')} style={styles.lockRow}>
                <Text style={[styles.lockText, { color: accent }]}>{t('battle.lockMeIn')}</Text>
              </Pressable>
            )
          )}

          {/* Mind-games stay available even while locked — they open on top of the
              battle (which is NOT removed, so the lock holds) and return here. */}
          <View style={styles.miniGames}>
            <Pressable onPress={openBrainBreak} accessibilityRole="button" accessibilityLabel={t('battle.brainBreakA11y')} style={styles.miniBtn}>
              <Text style={styles.miniText}>🧠 {t('battle.brainBreak')}</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('DragonDen')} accessibilityRole="button" accessibilityLabel={t('battle.denA11y')} style={styles.miniBtn}>
              <Text style={styles.miniText}>🐉 {t('battle.den')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ActivityPickerDeck
        visible={pickerOpen}
        quests={quests}
        selectedIds={selectedIds}
        onToggle={toggleSelected}
        onClose={() => setPickerOpen(false)}
        title={t('battle.chooseActivities')}
        selectWord={t('battle.fightWord')}
        selectedWord={t('battle.fightingWord')}
        doneWord={t('battle.done')}
        emptyText={t('battle.noHabits')}
        showTimer
        durations={durations}
        onSetDuration={setDuration}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  topbar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 28, paddingVertical: spacing.sm },
  retreat: { ...typography.label, color: MUTED, fontWeight: '600' },

  stageWrap: { flex: 1 },
  stage: { flex: 1 },
  stageContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingBottom: spacing.md },
  scrollHintWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.sm, alignItems: 'center' },
  scrollHintPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(31,41,55,0.88)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  scrollHintText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800' },
  scrollHintChevron: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', lineHeight: 16 },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  dragonName: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center', textTransform: 'capitalize' },
  taunt: { ...typography.body, color: MUTED, fontStyle: 'italic', textAlign: 'center' },

  healthTrack: { width: '70%', height: 10, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden', marginTop: spacing.md },
  healthFill: { height: 10, borderRadius: 999 },

  heroRow: { marginTop: spacing.md },
  dialWrap: { marginTop: spacing.sm },

  actvList: { alignSelf: 'stretch', marginTop: spacing.sm, gap: spacing.xs, paddingHorizontal: spacing.lg },
  actvHead: { ...typography.label, color: MUTED, letterSpacing: 1, fontWeight: '800' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: CARD, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1.5, maxWidth: '100%' },
  chipText: { ...typography.label, color: INK, fontWeight: '700', flexShrink: 1 },
  chipX: { ...typography.caption, color: MUTED, fontWeight: '900' },
  addChip: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: VIOLET, backgroundColor: '#EDE9FE' },
  addChipText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  victory: { ...typography.heading, fontWeight: '900' },
  victoryLine: { ...typography.body, color: INK, textAlign: 'center', paddingHorizontal: spacing.lg },
  summary: { marginTop: spacing.md, backgroundColor: CARD, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', gap: 4 },
  summaryText: { ...typography.body, color: INK, fontWeight: '700' },
  summaryCoins: { ...typography.label, color: '#B8860B', fontWeight: '800' },
  summaryPrepared: { ...typography.caption, color: '#0A6E5C', fontWeight: '800' },
  journey: { alignSelf: 'stretch', marginTop: spacing.md, gap: spacing.xs },
  journeyCaption: { ...typography.label, color: INK, fontWeight: '800', textAlign: 'center' },

  controls: { gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: { borderRadius: radii.pill, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  primaryBtnOff: { opacity: 0.4 },
  primaryText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  secondaryBtn: { borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E0' },
  secondaryText: { ...typography.label, color: INK, fontWeight: '700' },
  sub: { ...typography.body, color: MUTED },
  miniGames: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  miniBtn: { flex: 1, borderRadius: radii.pill, paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E0' },
  miniText: { ...typography.label, color: INK, fontWeight: '700' },
  lockRow: { alignItems: 'center', paddingVertical: spacing.sm },
  lockText: { ...typography.label, fontWeight: '800' },
  lockedText: { ...typography.label, color: MUTED, fontWeight: '700' },
});
