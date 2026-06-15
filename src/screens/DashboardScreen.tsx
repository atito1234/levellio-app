import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, G } from 'react-native-svg';
import { CapacityRing, HeroAvatar, ScreenContainer } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { usePlan } from '@/state/PlanContext';
import { useGoals, useGoalProgress } from '@/state/GoalContext';
import { useMotivation } from '@/state/useMotivation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Goal } from '@/lib/goal';
import { prioritizeAfterFirstOpen } from '@/lib/dashboard';
import { effectivePlan, plannedOpen, planProgress } from '@/lib/plan';
import { CAPACITIES, getCapacity } from '@/lib/compounding';
import { rippleForQuest } from '@/lib/habitCapacity';
import { isValidScheduleMinutes, minutesToLabel } from '@/lib/schedule';
import { dayKey } from '@/lib/dates';
import type { Quest } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Locked palette only.
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const TEAL = '#16C8A8';
const VIOLET = '#6C4CF1';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';
const PAD = 20;

const HRING = 188;
const HSTROKE = 16;
const HR = (HRING - HSTROKE) / 2;
const HC = 2 * Math.PI * HR;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 56;

/**
 * Home — the ring-first "Today billboard". Replaces the old checklist home in
 * place, wired to the real GameContext (quests, streak, level, completion) and
 * the real Day-12 buckets. Neuropsychology applied (commented inline):
 * Zeigarnik, goal-gradient, von Restorff, Hick, Fitts, Gestalt, fluency.
 */
export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { character, quests, suggestQuest, reorderQuests, status } = useGame();
  const { levels } = useCapacities();
  const { getPlan, reorderPlan } = usePlan();
  const { goals } = useGoals();
  const reduced = useReducedMotion();

  // The home reflects only TODAY'S PLAN (so it stays glanceable). No plan yet →
  // effectivePlan falls back to all habits, and we nudge the user to curate.
  const todayKey = dayKey(new Date());
  const plan = getPlan(todayKey);
  const [suggesting, setSuggesting] = useState(false);
  // Personalized, science-backed line from the user's real history + today.
  const motivation = useMotivation().text;

  const progress = useMemo(() => planProgress(quests, plan), [quests, plan]);

  // The planned, still-open habits (timed first) — the Now card + up-next strip.
  const openHabits = useMemo(() => plannedOpen(quests, plan), [quests, plan]);
  const [focusIndex, setFocusIndex] = useState(0);
  const safeIndex = openHabits.length ? Math.min(focusIndex, openHabits.length - 1) : 0;
  const focus = openHabits[safeIndex] ?? null;
  const canBrowse = openHabits.length > 1;

  const cardX = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current; // "Up next!" flourish
  const [dragging, setDragging] = useState(false); // locks vertical scroll mid-swipe

  // Swipe LEFT → next open activity (browse). Reduced-motion just switches.
  const goNext = useCallback(() => {
    if (openHabits.length < 2) return;
    const advance = () => setFocusIndex((i) => (Math.min(i, openHabits.length - 1) + 1) % openHabits.length);
    if (reduced) return advance();
    Animated.timing(cardX, { toValue: -SCREEN_W, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      advance();
      cardX.setValue(SCREEN_W);
      Animated.spring(cardX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
    });
  }, [openHabits.length, reduced, cardX]);

  // Swipe RIGHT → prioritize this activity to come right after the current one.
  const doPrioritize = useCallback(() => {
    if (!focus || openHabits.length < 2 || safeIndex === 0) {
      // Already first (or nothing to do): gently snap back.
      Animated.spring(cardX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
      return;
    }
    const focusId = focus.id;
    const apply = () => {
      // Prioritize within the plan when one exists; otherwise reorder globally.
      if (plan !== undefined) {
        const ids = prioritizeAfterFirstOpen(effectivePlan(quests, plan), focusId).map((q) => q.id);
        void reorderPlan(todayKey, ids);
      } else {
        void reorderQuests(prioritizeAfterFirstOpen(quests, focusId));
      }
      setFocusIndex(0);
      if (!reduced) {
        // Little celebratory flourish — like a "match" confirmation.
        flash.setValue(0);
        Animated.sequence([
          Animated.spring(flash, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, delay: 600, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    };
    if (reduced) return apply();
    Animated.timing(cardX, { toValue: SCREEN_W, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      apply();
      cardX.setValue(-SCREEN_W);
      Animated.spring(cardX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }).start();
    });
  }, [focus, openHabits.length, safeIndex, quests, plan, todayKey, reduced, reorderQuests, reorderPlan, cardX, flash]);

  // Stable refs so the once-created PanResponder always calls the latest handlers.
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const prioritizeRef = useRef(doPrioritize);
  prioritizeRef.current = doPrioritize;
  const canBrowseRef = useRef(canBrowse);
  canBrowseRef.current = canBrowse;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const settle = useCallback(() => {
    setDragging(false);
    Animated.spring(cardX, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [cardX]);
  const settleRef = useRef(settle);
  settleRef.current = settle;

  const pan = useRef(
    PanResponder.create({
      // Capture early on a horizontal intent so the vertical ScrollView never
      // steals the gesture (this is what stopped the card from "pushing down").
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        canBrowseRef.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderGrant: () => {
        if (!reducedRef.current) setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        if (!reducedRef.current) cardX.setValue(g.dx); // 1:1, like a real card
      },
      onPanResponderRelease: (_e, g) => {
        setDragging(false);
        const fling = Math.abs(g.vx) > 0.35;
        if (g.dx < -SWIPE_THRESHOLD || (fling && g.vx < 0)) goNextRef.current();
        else if (g.dx > SWIPE_THRESHOLD || (fling && g.vx > 0)) prioritizeRef.current();
        else settleRef.current();
      },
      onPanResponderTerminate: () => settleRef.current(),
    }),
  ).current;

  // Hero ring fill — goal-gradient: eases toward 100% as today's habits close.
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const to = progress.pct / 100;
    if (reduced) {
      fill.setValue(to);
      return;
    }
    Animated.timing(fill, { toValue: to, duration: 800, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
  }, [progress.pct, reduced, fill]);

  // Completion now flows through the Ripple habit-detail (one unified moment),
  // so tapping a habit opens its ring rather than silently checking a box.
  const openHabit = useCallback(
    (questId: string) => navigation.navigate('Ripple', { questId }),
    [navigation],
  );

  const handleSuggest = useCallback(async () => {
    try {
      setSuggesting(true);
      await suggestQuest('Build a better day');
    } finally {
      setSuggesting(false);
    }
  }, [suggestQuest]);

  if (status === 'loading' || !character) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <View style={styles.center}>
          <ActivityIndicator color={VIOLET} />
        </View>
      </ScreenContainer>
    );
  }

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const name = character.name?.trim() || 'there';
  const heroDone = progress.pct >= 100; // von Restorff: the single gold win.
  const offset = fill.interpolate({ inputRange: [0, 1], outputRange: [HC, 0] });

  // Tinder-style drag transforms (whole card tilts + fades as it flies).
  const cardRotate = cardX.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp' });
  const cardOpacity = cardX.interpolate({ inputRange: [-SCREEN_W, -SCREEN_W * 0.55, 0, SCREEN_W * 0.55, SCREEN_W], outputRange: [0, 1, 1, 1, 0], extrapolate: 'clamp' });
  const stampNextOpacity = cardX.interpolate({ inputRange: [-140, -40, 0], outputRange: [1, 0.3, 0], extrapolate: 'clamp' });
  const stampDoOpacity = cardX.interpolate({ inputRange: [0, 40, 140], outputRange: [0, 0.3, 1], extrapolate: 'clamp' });
  const flashOpacity = flash;
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <ScreenContainer backgroundColor={BG} noPadding edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        scrollEnabled={!dragging}
      >
        {/* Greeting — real name + real streak + level. */}
        <View style={styles.greetRow}>
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Character' })}
            accessibilityRole="button"
            accessibilityLabel="Open your hero"
          >
            <HeroAvatar presentation={character.presentation} tier={character.tier} kitId={character.kitId} size={52} />
          </Pressable>
          <View style={styles.greetText}>
            <Text style={styles.greeting}>
              {partOfDay}, {name}
            </Text>
            {motivation ? (
              <Text style={styles.motivation} numberOfLines={2}>
                {motivation}
              </Text>
            ) : null}
          </View>
          <View style={styles.pills}>
            <View style={styles.pill} accessibilityLabel={`${character.streakDays} day streak`}>
              <Text style={styles.pillText}>🔥 {character.streakDays}</Text>
            </View>
            <View style={[styles.pill, styles.pillViolet]} accessibilityLabel={`Level ${character.level}`}>
              <Text style={[styles.pillText, { color: VIOLET }]}>Lv {character.level}</Text>
            </View>
          </View>
        </View>

        {/* Life goals — the "why" habits ladder up to. Tap to focus a goal. */}
        <GoalsStrip
          goals={goals}
          onOpen={(id) => navigation.navigate('GoalFocus', { goalId: id })}
          onNew={() => navigation.navigate('GoalEditor')}
        />

        {/* Hero billboard — Zeigarnik: a large open ring pulls completion.
            Swipe to browse open activities: left = next, right = prioritize. */}
        <View style={styles.billboard} {...(canBrowse ? pan.panHandlers : {})}>
         <View style={styles.billboardClip}>
          <Animated.View
            style={[
              styles.heroCard,
              canBrowse && { transform: [{ translateX: cardX }, { rotate: cardRotate }], opacity: cardOpacity },
            ]}
          >
          <Text style={styles.billboardKicker}>YOUR FOCUS RIGHT NOW</Text>
          <View style={styles.ringStage}>
            {/* subtle glassmorphism glow behind the ring */}
            <View style={[styles.glow, { backgroundColor: heroDone ? GOLD : VIOLET }]} pointerEvents="none" />
            <Svg width={HRING} height={HRING} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Circle cx={HRING / 2} cy={HRING / 2} r={HR} stroke="#E8E6E0" strokeWidth={HSTROKE} fill="none" />
              <G transform={`rotate(-90, ${HRING / 2}, ${HRING / 2})`}>
                <AnimatedCircle
                  cx={HRING / 2}
                  cy={HRING / 2}
                  r={HR}
                  stroke={heroDone ? GOLD : TEAL}
                  strokeWidth={HSTROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={HC}
                  strokeDashoffset={offset}
                />
              </G>
            </Svg>
            <View style={styles.ringCenter} pointerEvents="none">
              <View style={styles.ringPctWrap}>
                <Text style={styles.ringPct} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {progress.pct}%
                </Text>
              </View>
              <Text style={styles.ringSub}>
                {progress.done} of {progress.total} today
              </Text>
            </View>
          </View>

          {focus ? (
            <View
              style={styles.focusBlock}
              accessible
              accessibilityLabel={`Focus activity ${safeIndex + 1} of ${openHabits.length}: ${focus.title}`}
              accessibilityActions={
                canBrowse
                  ? [
                      { name: 'next', label: 'Next activity' },
                      { name: 'prioritize', label: 'Prioritize this activity to be next' },
                    ]
                  : []
              }
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'next') goNext();
                else if (e.nativeEvent.actionName === 'prioritize') doPrioritize();
              }}
            >
              <Text style={styles.focusName} numberOfLines={2}>
                {focus.title}
              </Text>
              {isValidScheduleMinutes(focus.scheduledTime) && (
                <Text style={styles.focusTime} accessibilityLabel={`Scheduled for ${minutesToLabel(focus.scheduledTime)}`}>
                  ⏰ {minutesToLabel(focus.scheduledTime)}
                </Text>
              )}
              <Pressable
                onPress={() => navigation.navigate('Connections', { questId: focus.id })}
                accessibilityRole="button"
                accessibilityLabel={`See how ${focus.title} connects`}
              >
                <Text style={styles.focusFeeds}>
                  Strengthens {rippleForQuest(focus).slice(0, 2).map((d) => getCapacity(d.capacityId).name).join(' · ')}
                  {'  '}🔗
                </Text>
              </Pressable>
              {/* Fitts: large, full-width, thumb-reachable primary action. */}
              <Pressable
                onPress={() => openHabit(focus.id)}
                accessibilityRole="button"
                accessibilityLabel={`Do it now: ${focus.title}`}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Do it now</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('ActivityTimer', { questId: focus.id })}
                accessibilityRole="button"
                accessibilityLabel={`Start a focus session: ${focus.title}`}
                style={styles.focusBtn}
                hitSlop={8}
              >
                <Text style={styles.focusBtnText}>🎯 Focus session</Text>
              </Pressable>

              {/* Non-gesture controls + position (swipe is an enhancement). */}
              {canBrowse && (
                <View style={styles.focusNav}>
                  <Pressable
                    onPress={doPrioritize}
                    disabled={safeIndex === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Prioritize this activity to be next"
                    hitSlop={8}
                    style={safeIndex === 0 && styles.navDisabled}
                  >
                    <Text style={styles.navBtn}>⤴ Do next</Text>
                  </Pressable>
                  <Text style={styles.navPos}>
                    {safeIndex + 1} of {openHabits.length}
                  </Text>
                  <Pressable onPress={goNext} accessibilityRole="button" accessibilityLabel="Next activity" hitSlop={8}>
                    <Text style={styles.navBtn}>Next ›</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : quests.length === 0 ? (
            <>
              <Text style={styles.focusName}>Add your first habit</Text>
              <Pressable
                onPress={() => navigation.navigate('QuestEditor')}
                accessibilityRole="button"
                accessibilityLabel="Add your first habit"
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>＋ Add a habit</Text>
              </Pressable>
            </>
          ) : progress.total > 0 ? (
            <Text style={styles.allDone}>All planned done 🎉</Text>
          ) : (
            <>
              <Text style={styles.focusName}>Nothing planned yet</Text>
              <Pressable
                onPress={() => navigation.navigate('Plan')}
                accessibilityRole="button"
                accessibilityLabel="Plan your day"
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>🗓 Plan your day</Text>
              </Pressable>
            </>
          )}
          </Animated.View>

          {canBrowse && (
            <>
              <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLeft, { opacity: stampNextOpacity }]}>
                <Text style={styles.stampNextText}>‹ NEXT</Text>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampRight, { opacity: stampDoOpacity }]}>
                <Text style={styles.stampDoText}>DO NEXT ⤴</Text>
              </Animated.View>
            </>
          )}
          <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]}>
            <Text style={styles.flashText}>Up next! ⤴</Text>
          </Animated.View>
         </View>
        </View>

        {/* Up next today — the rest of the plan, one tap to bring it forward. */}
        {openHabits.length > 1 && (
          <View style={styles.upNext}>
            <Text style={styles.upNextLabel}>Up next today</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upNextRow}>
              {openHabits.map((q, i) =>
                i === safeIndex ? null : (
                  <Pressable
                    key={q.id}
                    onPress={() => setFocusIndex(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Bring ${q.title} to focus`}
                    style={styles.upNextChip}
                  >
                    {isValidScheduleMinutes(q.scheduledTime) && (
                      <Text style={styles.upNextTime}>⏰ {minutesToLabel(q.scheduledTime)}</Text>
                    )}
                    <Text style={styles.upNextChipText} numberOfLines={1}>
                      {q.title}
                    </Text>
                  </Pressable>
                ),
              )}
            </ScrollView>
          </View>
        )}

        {/* Plan CTA — the one place to curate today/tomorrow (declutters home). */}
        <Pressable
          onPress={() => navigation.navigate('Plan')}
          accessibilityRole="button"
          accessibilityLabel="Plan your day"
          accessibilityHint="Choose which habits to work on today or tomorrow"
          style={styles.planCta}
        >
          <View style={styles.planCtaMain}>
            <Text style={styles.planCtaTitle}>🗓 Plan your day</Text>
            <Text style={styles.planCtaSub}>
              {plan === undefined ? 'Pick what to focus on — today or tomorrow' : `${progress.total} planned today`}
            </Text>
          </View>
          <Text style={styles.planCtaChevron}>›</Text>
        </Pressable>

        {/* Quick actions — keeps every feature, low clutter (Hick's law). */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          <QuickChip label="🎤 Quick add" onPress={() => navigation.navigate('QuickCapture')} />
          <QuickChip label="＋ New" onPress={() => navigation.navigate('QuestEditor')} />
          <QuickChip label="📚 Library" onPress={() => navigation.navigate('HabitLibrary')} />
          <QuickChip label="🗂 Buckets" onPress={() => navigation.navigate('Organize')} />
          <QuickChip label="🔗 Connections" onPress={() => navigation.navigate('Connections')} />
          <QuickChip label={suggesting ? '…' : '✨ Suggest'} onPress={handleSuggest} />
        </ScrollView>

        {/* Your capacities — the shared rings every completion feeds (real data). */}
        <View style={styles.capHead}>
          <Text style={styles.railLabel}>Your capacities · last 7 days</Text>
          <Pressable
            onPress={() => navigation.navigate('MonthlyProgress')}
            accessibilityRole="button"
            accessibilityLabel="See your monthly progress"
          >
            <Text style={styles.capLink}>Trends ›</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capStrip}>
          {CAPACITIES.map((cap) => {
            const lvl = Math.round(levels[cap.id]);
            return (
              <Pressable
                key={cap.id}
                onPress={() => navigation.navigate('CapacityFocus', { capacityId: cap.id })}
                accessibilityRole="button"
                accessibilityLabel={`${cap.name} ${lvl} percent. See habits that strengthen it`}
                style={styles.capCell}
              >
                <View style={styles.capRingWrap}>
                  <CapacityRing level={lvl} colorId={cap.colorId} size={56} strokeWidth={6} />
                  <View style={styles.capRingCenter} pointerEvents="none">
                    <Text style={styles.capRingPct}>{lvl}%</Text>
                  </View>
                </View>
                <Text style={styles.capCellName}>{cap.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.quickChip}>
      <Text style={styles.quickChipText}>{label}</Text>
    </Pressable>
  );
}

/** The horizontal strip of life goals (the "why"), plus a New-goal card. */
function GoalsStrip({
  goals,
  onOpen,
  onNew,
}: {
  goals: Goal[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  if (goals.length === 0) {
    return (
      <Pressable
        onPress={onNew}
        accessibilityRole="button"
        accessibilityLabel="Set a goal"
        accessibilityHint="Create a life goal your habits build toward"
        style={styles.goalEmpty}
      >
        <Text style={styles.goalEmojiLg}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalEmptyTitle}>What do you want to build toward?</Text>
          <Text style={styles.goalEmptySub}>Set a goal — your habits do the rest</Text>
        </View>
        <Text style={styles.goalChevron}>›</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.goalsWrap}>
      <Text style={styles.railLabel}>Your goals</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsRow}>
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} onPress={() => onOpen(g.id)} />
        ))}
        <Pressable onPress={onNew} accessibilityRole="button" accessibilityLabel="New goal" style={styles.goalNew}>
          <Text style={styles.goalNewPlus}>＋</Text>
          <Text style={styles.goalNewText}>New goal</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function GoalCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const progress = useGoalProgress(goal);
  const accent = goal.colorId === 'teal' ? TEAL : VIOLET;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}. ${progress.doneTodayInGoal} of ${progress.plannedTodayInGoal} done today, ${progress.weeklyConsistencyPct} percent this week.`}
      style={styles.goalCard}
    >
      <Text style={styles.goalEmoji}>{goal.emoji}</Text>
      <Text style={styles.goalTitle} numberOfLines={2}>
        {goal.title}
      </Text>
      <View style={styles.goalBar}>
        <View style={[styles.goalBarFill, { backgroundColor: accent, width: `${Math.max(3, progress.weeklyConsistencyPct)}%` }]} />
      </View>
      <Text style={styles.goalMeta}>
        {progress.doneTodayInGoal}/{progress.plannedTodayInGoal} today
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },

  greetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: PAD },
  greetText: { flex: 1, gap: 2 },
  greeting: { ...typography.title, color: INK, fontWeight: '800' },
  motivation: { ...typography.caption, color: MUTED },
  pills: { gap: 6, alignItems: 'flex-end' },
  pill: { backgroundColor: '#FFF', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: '#E8E6E0' },
  pillViolet: { borderColor: '#E2DBFB', backgroundColor: '#F4F1FE' },
  pillText: { ...typography.caption, color: INK, fontWeight: '800' },

  billboard: {
    marginHorizontal: PAD,
    backgroundColor: CARD,
    borderRadius: 24,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  billboardClip: { borderRadius: 24, overflow: 'hidden' },
  heroCard: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  stamp: {
    position: 'absolute',
    top: 18,
    borderWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: [{ rotate: '-12deg' }],
  },
  stampLeft: { left: 18, borderColor: TEAL },
  stampRight: { right: 18, borderColor: VIOLET, transform: [{ rotate: '12deg' }] },
  stampNextText: { ...typography.label, color: TEAL, fontWeight: '900', letterSpacing: 1 },
  stampDoText: { ...typography.label, color: VIOLET, fontWeight: '900', letterSpacing: 1 },
  flash: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  flashText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
    backgroundColor: VIOLET,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  billboardKicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  ringStage: { width: HRING, height: HRING, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm },
  glow: { position: 'absolute', width: HRING - 30, height: HRING - 30, borderRadius: HRING, opacity: 0.08 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // Keep the big % comfortably inside the inner disc; auto-shrinks for "100%".
  ringPctWrap: { width: HRING - 2 * HSTROKE - 24, alignItems: 'center' },
  ringPct: { ...typography.heading, color: INK, fontWeight: '900', fontSize: 34 },
  ringSub: { ...typography.caption, color: MUTED },
  focusBlock: { width: '100%', alignItems: 'center', gap: spacing.sm },
  focusName: { ...typography.title, color: INK, textAlign: 'center', fontWeight: '700' },
  focusFeeds: { ...typography.caption, color: MUTED, textAlign: 'center' },
  focusTime: { ...typography.caption, color: '#6C4CF1', fontWeight: '700', textAlign: 'center' },
  focusNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
  navBtn: { ...typography.label, color: VIOLET, fontWeight: '700' },
  navPos: { ...typography.caption, color: MUTED },
  navDisabled: { opacity: 0.35 },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: VIOLET,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
    shadowColor: VIOLET,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryBtnText: { ...typography.title, color: '#FFF', fontWeight: '800' },
  focusBtn: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  focusBtnText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  allDone: { ...typography.body, color: TEAL, fontWeight: '700', marginTop: spacing.xs },

  upNext: { gap: spacing.xs },
  upNextLabel: { ...typography.label, color: MUTED, letterSpacing: 1, paddingHorizontal: PAD },
  upNextRow: { gap: spacing.sm, paddingHorizontal: PAD },
  upNextChip: { backgroundColor: CARD, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: 180, borderWidth: 1, borderColor: '#ECEAE4' },
  upNextTime: { ...typography.caption, color: VIOLET, fontWeight: '700', fontSize: 10 },
  upNextChipText: { ...typography.label, color: INK, fontWeight: '600' },

  planCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: PAD,
    backgroundColor: '#F4F1FE',
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2DBFB',
  },
  planCtaMain: { flex: 1, gap: 2 },
  planCtaTitle: { ...typography.title, color: INK, fontWeight: '800' },
  planCtaSub: { ...typography.caption, color: MUTED },
  planCtaChevron: { fontSize: 26, color: VIOLET, fontWeight: '800' },

  goalsWrap: { gap: spacing.xs },
  goalsRow: { gap: spacing.sm, paddingHorizontal: PAD },
  goalCard: { width: 150, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, gap: 6, borderWidth: 1, borderColor: '#ECEAE4' },
  goalEmoji: { fontSize: 24 },
  goalTitle: { ...typography.label, color: INK, fontWeight: '700', minHeight: 34 },
  goalBar: { height: 6, borderRadius: 999, backgroundColor: '#ECEAE4', overflow: 'hidden' },
  goalBarFill: { height: 6, borderRadius: 999 },
  goalMeta: { ...typography.caption, color: MUTED, fontSize: 11 },
  goalNew: { width: 110, backgroundColor: '#F4F1FE', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#E2DBFB' },
  goalNewPlus: { fontSize: 22, color: VIOLET, fontWeight: '800' },
  goalNewText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  goalEmpty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: PAD, backgroundColor: '#F4F1FE', borderRadius: radii.xl, padding: spacing.lg, borderWidth: 1, borderColor: '#E2DBFB' },
  goalEmojiLg: { fontSize: 28 },
  goalEmptyTitle: { ...typography.body, color: INK, fontWeight: '800' },
  goalEmptySub: { ...typography.caption, color: MUTED },
  goalChevron: { fontSize: 24, color: VIOLET, fontWeight: '800' },

  capHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD },
  capLink: { ...typography.caption, color: VIOLET, fontWeight: '700' },
  capStrip: { gap: spacing.md, paddingHorizontal: PAD },
  capCell: { alignItems: 'center', gap: 4, width: 64 },
  capRingWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  capRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  capRingPct: { ...typography.caption, color: INK, fontWeight: '800', fontSize: 11 },
  capCellName: { ...typography.caption, color: MUTED, fontSize: 11 },
  quickRow: { gap: spacing.sm, paddingHorizontal: PAD },
  quickChip: { backgroundColor: '#FFF', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#E8E6E0' },
  quickChipText: { ...typography.label, color: INK },

  rail: { gap: spacing.sm },
  railHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD },
  railLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  railGlyph: { fontSize: 18 },
  railLabel: { ...typography.title, color: INK, fontWeight: '700' },
  railCount: { ...typography.caption, color: MUTED },
  railScroll: { gap: spacing.md, paddingHorizontal: PAD },

  card: {
    width: 116,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardDone: { backgroundColor: '#FFFCF4' },
  cardRing: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  cardRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  cardRingMark: { ...typography.title, color: GOLD, fontWeight: '900' },
  cardName: { ...typography.caption, color: INK, fontWeight: '600', textAlign: 'center' },
  cardNameDone: { color: MUTED },
});
