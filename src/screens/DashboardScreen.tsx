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
import { BucketIcon } from '@/components/BucketIcon';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useCapacities } from '@/state/CapacitiesContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { dayProgress, groupHabitsIntoRails, prioritizeAfterFirstOpen, type HabitRail } from '@/lib/dashboard';
import { CATEGORY_META } from '@/lib/categories';
import { CAPACITIES, getCapacity } from '@/lib/compounding';
import { rippleForQuest } from '@/lib/habitCapacity';
import { getBucketColor } from '@/lib/buckets';
import { defaultAIEngine } from '@/services/ai';
import type { Quest, QuestCategory } from '@/types';
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
  const { buckets, assignments } = useBuckets();
  const { levels } = useCapacities();
  const reduced = useReducedMotion();
  const [motivation, setMotivation] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!character) return;
    let active = true;
    defaultAIEngine.motivate({ streakDays: character.streakDays, level: character.level }).then((line) => {
      if (active) setMotivation(line);
    });
    return () => {
      active = false;
    };
  }, [character]);

  const progress = useMemo(() => dayProgress(quests), [quests]);
  const rails = useMemo(() => groupHabitsIntoRails(quests, buckets, assignments), [quests, buckets, assignments]);

  // Browse the open habits with a swipe to choose what to tackle now.
  const openHabits = useMemo(() => quests.filter((q) => !q.completed), [quests]);
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
      void reorderQuests(prioritizeAfterFirstOpen(quests, focusId));
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
  }, [focus, openHabits.length, safeIndex, quests, reduced, reorderQuests, cardX]);

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
              <Text style={styles.motivation} numberOfLines={1}>
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
          ) : (
            <Text style={styles.allDone}>All done for today 🎉</Text>
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

        {/* Quick actions — keeps every feature, low clutter (Hick's law). */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          <QuickChip label="＋ New" onPress={() => navigation.navigate('QuestEditor')} />
          <QuickChip label="📚 Library" onPress={() => navigation.navigate('HabitLibrary')} />
          <QuickChip label="🗂 Buckets" onPress={() => navigation.navigate('Organize')} />
          <QuickChip label="🔗 Connections" onPress={() => navigation.navigate('Connections')} />
          <QuickChip label={suggesting ? '…' : '✨ Suggest'} onPress={handleSuggest} />
        </ScrollView>

        {/* Your capacities — the shared rings every completion feeds (real data). */}
        <View style={styles.capHead}>
          <Text style={styles.railLabel}>Your capacities</Text>
          <Pressable
            onPress={() => navigation.navigate('MonthlyProgress')}
            accessibilityRole="button"
            accessibilityLabel="See your monthly progress"
          >
            <Text style={styles.capLink}>This month ›</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capStrip}>
          {CAPACITIES.map((cap) => {
            const lvl = Math.round(levels[cap.id]);
            return (
              <View key={cap.id} style={styles.capCell} accessibilityLabel={`${cap.name} ${lvl} percent`}>
                <View style={styles.capRingWrap}>
                  <CapacityRing level={lvl} colorId={cap.colorId} size={56} strokeWidth={6} />
                  <View style={styles.capRingCenter} pointerEvents="none">
                    <Text style={styles.capRingPct}>{lvl}%</Text>
                  </View>
                </View>
                <Text style={styles.capCellName}>{cap.name}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Rails — Gestalt grouping: each life-area reads as one coherent row. */}
        {rails.map((rail) => (
          <Rail
            key={rail.id}
            rail={rail}
            buckets={buckets}
            onOpen={openHabit}
            onEdit={(id) => navigation.navigate('QuestEditor', { questId: id })}
          />
        ))}

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

function Rail({
  rail,
  buckets,
  onOpen,
  onEdit,
}: {
  rail: HabitRail;
  buckets: ReturnType<typeof useBuckets>['buckets'];
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const open = rail.habits.filter((h) => !h.completed).length;
  const bucket = rail.source === 'bucket' ? buckets.find((b) => b.id === rail.sourceId) : undefined;
  const accent = bucket ? getBucketColor(bucket.colorId).accent : VIOLET;

  return (
    <View style={styles.rail}>
      <View style={styles.railHead}>
        <View style={styles.railLabelWrap}>
          {bucket ? (
            <BucketIcon iconId={bucket.iconId} size={18} tint={accent} />
          ) : (
            <Text style={styles.railGlyph}>
              {rail.source === 'category' ? CATEGORY_META[rail.sourceId as QuestCategory].icon : '🗂'}
            </Text>
          )}
          <Text style={styles.railLabel}>{rail.label}</Text>
        </View>
        <Text style={styles.railCount}>{open ? `${open} to do` : 'all done'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
        {rail.habits.map((h) => (
          <HabitCard key={h.id} quest={h} onOpen={onOpen} onEdit={onEdit} />
        ))}
      </ScrollView>
    </View>
  );
}

function HabitCard({
  quest,
  onOpen,
  onEdit,
}: {
  quest: Quest;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const done = quest.completed;
  // Honest: a binary habit is 0% (open ring, Zeigarnik) or 100% (gold win).
  return (
    <Pressable
      onPress={() => onOpen(quest.id)}
      onLongPress={() => onEdit(quest.id)}
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${quest.title}, ${done ? 'completed' : 'not done'}`}
      accessibilityHint={done ? 'Opens the habit. Long press to edit.' : 'Opens the habit to complete it. Long press to edit.'}
      style={[styles.card, done && styles.cardDone]}
    >
      <View style={styles.cardRing}>
        <CapacityRing level={done ? 100 : 0} colorId="teal" size={56} strokeWidth={6} />
        <View style={styles.cardRingCenter} pointerEvents="none">
          <Text style={styles.cardRingMark}>{done ? '✓' : ''}</Text>
        </View>
      </View>
      <Text style={[styles.cardName, done && styles.cardNameDone]} numberOfLines={2}>
        {quest.title}
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
  allDone: { ...typography.body, color: TEAL, fontWeight: '700', marginTop: spacing.xs },

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
