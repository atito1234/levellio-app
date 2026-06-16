import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { usePlan } from '@/state/PlanContext';
import { useLinks } from '@/state/LinksContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { ACHIEVEMENT_GOLD, getAction, getCapacity, ripple } from '@/lib/compounding';
import { rippleForQuest } from '@/lib/habitCapacity';
import { activityTiming } from '@/lib/activityTimer';
import { nextActivity, type NextReason } from '@/lib/nextActivity';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import type { QuestReward } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Ripple'>;

// Locked palette only.
const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const TEAL = '#16C8A8';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#E8E6E0';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HRING = 236;
const HSTROKE = 18;
const HR = (HRING - HSTROKE) / 2;
const HC = 2 * Math.PI * HR;

export function RippleScreen({ route, navigation }: Props) {
  const reduced = useReducedMotion();
  const { quests } = useGame();
  const { goals } = useGoals();
  const { getPlan } = usePlan();
  const { links } = useLinks();
  const complete = useCompleteActivity();

  // The Ripple is the real habit detail when given a questId; otherwise it's the
  // seed-action demo (the "💧 The Ripple" quick chip).
  const questId = route.params?.questId;
  const quest = questId ? quests.find((q) => q.id === questId) : undefined;
  const actionId = route.params?.actionId ?? 'water';
  const seedAction = getAction(actionId) ?? getAction('water')!;

  const title = quest ? quest.title : seedAction.name;
  const crumb = quest ? `${CATEGORY_META[quest.category].label} · daily` : 'Health · daily';
  const showGlass = !quest && actionId === 'water';
  // Honest UI: real deltas, derived from the habit's category (or the seed action).
  const deltas = (quest ? rippleForQuest(quest) : ripple(seedAction.id)).slice(0, 3);
  const alreadyDone = quest?.completed ?? false;
  const timing = quest ? activityTiming(quest) : null;
  const startLabel = timing
    ? timing.method === 'pomodoro'
      ? `Start focus · ${timing.minutes} min`
      : `Start ${timing.minutes}-min timer`
    : null;

  const [done, setDone] = useState(alreadyDone);
  const [shown, setShown] = useState<number[]>(deltas.map((d) => (alreadyDone ? d.delta : 0)));

  const fill = useRef(new Animated.Value(0)).current; // hero ring 0→1
  const ripA = useRef(new Animated.Value(0)).current; // expanding ripple (the peak)
  const heroPulse = useRef(new Animated.Value(0)).current; // calm end-state loop
  const chipVal = useRef(deltas.map(() => new Animated.Value(0))).current; // count-up
  const chipPulse = useRef(deltas.map(() => new Animated.Value(0))).current; // settle pulse

  // Count-up listeners drive the ticking numbers (and the small rings filling).
  useEffect(() => {
    const subs = chipVal.map((v, i) =>
      v.addListener(({ value }) => setShown((s) => (s[i] === Math.round(value) ? s : s.map((x, j) => (j === i ? Math.round(value) : x))))),
    );
    return () => chipVal.forEach((v, i) => v.removeListener(subs[i]!));
  }, [chipVal]);

  // If the habit is already done today, open straight into the completed state.
  useEffect(() => {
    if (alreadyDone) {
      fill.setValue(1);
      chipVal.forEach((v, i) => v.setValue(deltas[i]!.delta));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startHeroLoop = useCallback(() => {
    // Peak-end rule: after the peak, settle into a calm, alive end-state.
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [heroPulse]);

  const playPayoff = useCallback(() => {
    // Peak: a soft ripple radiates outward at the climax.
    Animated.timing(ripA, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    // Staggered cascade — Gestalt common-fate; each capacity ticks + pulses in turn.
    Animated.stagger(
      170,
      chipVal.map((v, i) =>
        Animated.parallel([
          // Goal-gradient: the count-up eases faster as it approaches its target.
          Animated.timing(v, { toValue: deltas[i]!.delta, duration: 620, easing: Easing.in(Easing.quad), useNativeDriver: false }),
          Animated.sequence([
            Animated.spring(chipPulse[i]!, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
            Animated.spring(chipPulse[i]!, { toValue: 0, friction: 6, tension: 70, useNativeDriver: true }),
          ]),
        ]),
      ),
    ).start(startHeroLoop);
  }, [ripA, chipVal, chipPulse, deltas, startHeroLoop]);

  const handleDone = useCallback(async () => {
    if (done) return;
    setDone(true);

    // Real habit: complete ONCE (manual log) and ripple into the shared capacity
    // levels + bucket contribution + a session record — every screen reflects it.
    let reward: QuestReward | null = null;
    if (quest && !alreadyDone) {
      reward = await complete(quest, { method: 'manual', durationSec: 0 });
    }
    const celebrate = () => {
      if (reward?.leveledUp) navigation.navigate('QuestComplete', { reward: reward! });
    };

    if (reduced) {
      // Reduced motion: render the satisfying completed end-state instantly.
      fill.setValue(1);
      chipVal.forEach((v, i) => v.setValue(deltas[i]!.delta));
      setShown(deltas.map((d) => d.delta));
      celebrate();
      return;
    }

    Animated.sequence([
      // Goal-gradient: the hero ring visibly accelerates as it nears 100%.
      Animated.timing(fill, { toValue: 1, duration: 900, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      // Variable-reward / dopaminergic anticipation: a brief held beat before payoff.
      Animated.delay(240),
    ]).start(playPayoff);
    // Let the ripple play, then hand off to the level-up celebration if earned.
    if (reward?.leveledUp) setTimeout(celebrate, 2000);
  }, [done, reduced, fill, chipVal, deltas, playPayoff, quest, alreadyDone, complete, navigation]);

  // Hero ring stroke: teal while filling; von Restorff gold ONLY at the 100% win.
  const heroStroke = fill.interpolate({ inputRange: [0, 0.92, 1], outputRange: [TEAL, TEAL, ACHIEVEMENT_GOLD] });
  const heroOffset = fill.interpolate({ inputRange: [0, 1], outputRange: [HC, 0] });
  const heroScale = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const ripScale = ripA.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.9] });
  const ripOpacity = ripA.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.32, 0] });

  const summary = deltas.map((d) => `${getCapacity(d.capacityId).name} up ${d.delta} percent`).join(', ');

  // Once done, suggest the next activity (chain → same goal → anywhere).
  const suggestion = useMemo(
    () => (quest && done ? nextActivity({ justCompletedId: quest.id, quests, plannedIds: getPlan(dayKey(new Date())), goals, links }) : null),
    [quest, done, quests, goals, links, getPlan],
  );

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Top bar — Hick's law: minimal chrome, one journey. */}
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Text style={styles.crumb}>{crumb}</Text>
          <View style={styles.chevronSpacer} />
        </View>

        <Text style={styles.kicker}>TODAY&apos;S RING</Text>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>

        {/* Hero ring — Zeigarnik: an open ring pulls you to close it. */}
        <View style={styles.heroStage}>
          {!reduced && (
            <Animated.View
              pointerEvents="none"
              style={[styles.ripple, { opacity: ripOpacity, transform: [{ scale: ripScale }] }]}
            />
          )}
          <Animated.View style={{ transform: [{ scale: reduced ? 1 : heroScale }] }}>
            <Svg width={HRING} height={HRING} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Circle cx={HRING / 2} cy={HRING / 2} r={HR} stroke={TRACK} strokeWidth={HSTROKE} fill="none" />
              <G transform={`rotate(-90, ${HRING / 2}, ${HRING / 2})`}>
                <AnimatedCircle
                  cx={HRING / 2}
                  cy={HRING / 2}
                  r={HR}
                  stroke={done && reduced ? ACHIEVEMENT_GOLD : heroStroke}
                  strokeWidth={HSTROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={HC}
                  strokeDashoffset={done && reduced ? 0 : heroOffset}
                />
              </G>
              {showGlass && <GlassGlyph cx={HRING / 2} cy={HRING / 2} />}
            </Svg>
          </Animated.View>
        </View>

        {/* Capacities it feeds — honest preview before, real deltas after. */}
        <Text style={styles.sectionLabel}>ALSO STRENGTHENS</Text>
        <View style={styles.chipsRow}>
          {deltas.map((d, i) => {
            const cap = getCapacity(d.capacityId);
            const scale = chipPulse[i]!.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
            return (
              <Animated.View
                key={d.capacityId}
                style={[styles.chip, { transform: [{ scale: reduced ? 1 : scale }] }]}
                accessibilityLabel={`${cap.name} plus ${d.delta} percent`}
              >
                <View style={styles.ringWrap}>
                  <CapacityRing level={shown[i] ?? 0} colorId={cap.colorId} size={64} strokeWidth={6} />
                  <View style={styles.ringCenter} pointerEvents="none">
                    <Text style={styles.ringCenterText}>{done ? `+${shown[i] ?? 0}%` : '—'}</Text>
                  </View>
                </View>
                <Text style={styles.chipName}>{cap.name}</Text>
              </Animated.View>
            );
          })}
        </View>

        <Text style={styles.caption}>One action. Many rings move.</Text>
        <Text style={styles.footnote}>
          A habit is a node, not a checkbox — closing one ring quietly lifts everything it feeds.
        </Text>
        {quest && (
          <Pressable
            onPress={() => navigation.navigate('Connections', { questId: quest.id })}
            accessibilityRole="button"
            accessibilityLabel="See how this activity connects"
            style={styles.connLink}
          >
            <Text style={styles.connLinkText}>🔗 See how this connects ›</Text>
          </Pressable>
        )}
        {quest && (
          <Pressable
            onPress={() => navigation.navigate('Insights', { activityId: quest.id })}
            accessibilityRole="button"
            accessibilityLabel="See this activity's history and best times"
            style={styles.connLink}
          >
            <Text style={styles.connLinkText}>📈 See its history ›</Text>
          </Pressable>
        )}
        {done && (
          <Text style={styles.srOnly} accessibilityLiveRegion="polite">
            {summary}
          </Text>
        )}
      </ScrollView>

      {/* Per-activity actions — timer/Pomodoro to DO it, or log it now (Fitts). */}
      {quest && !done ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate('ActivityTimer', { questId: quest.id })}
            accessibilityRole="button"
            accessibilityLabel={startLabel ?? 'Start'}
            style={styles.timerBtn}
          >
            <Text style={styles.timerBtnText}>⏱ {startLabel}</Text>
          </Pressable>
          <Pressable onPress={handleDone} accessibilityRole="button" accessibilityLabel={`Just log ${title}`} style={styles.logBtn}>
            <Text style={styles.logBtnText}>Just log it now</Text>
          </Pressable>
        </View>
      ) : done && quest && suggestion?.next ? (
        <View style={styles.actions}>
          <Text style={styles.nextKicker}>✓ Logged · {nextReasonLabel(suggestion.reason)}</Text>
          <Pressable
            onPress={() => navigation.replace('Ripple', { questId: suggestion.next!.id })}
            accessibilityRole="button"
            accessibilityLabel={`Next up: ${suggestion.next.title}. Do it now`}
            style={styles.timerBtn}
          >
            <Text style={styles.timerBtnText} numberOfLines={1}>
              Next up: {suggestion.next.title}  ›
            </Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
            accessibilityRole="button"
            accessibilityLabel={suggestion.goalChoices.length > 1 ? 'Focus a different goal' : 'Back to Today'}
            style={styles.logBtn}
          >
            <Text style={styles.logBtnText}>{suggestion.goalChoices.length > 1 ? 'Focus a different goal ›' : 'Back to Today ›'}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={handleDone}
          disabled={done}
          accessibilityRole="button"
          accessibilityState={{ disabled: done }}
          accessibilityLabel={done ? `${title} completed` : `Mark ${title} done`}
          style={[styles.doneBtn, done && styles.doneBtnDone]}
        >
          <Text style={[styles.doneText, done && styles.doneTextDone]}>{done ? '✓ Logged' : 'Done'}</Text>
        </Pressable>
      )}
    </ScreenContainer>
  );
}

function nextReasonLabel(reason: NextReason): string {
  switch (reason) {
    case 'chain':
      return 'next in your chain';
    case 'goal':
      return 'keep this goal moving';
    default:
      return 'next up';
  }
}

/** Simple tumbler-of-water glyph centered in the hero ring (decorative). */
function GlassGlyph({ cx, cy }: { cx: number; cy: number }) {
  const w = 44;
  const h = 56;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    <G>
      {/* water fill (lower ~58%) */}
      <Rect x={x + 5} y={y + h * 0.42} width={w - 10} height={h * 0.5} rx={3} fill={TEAL} opacity={0.85} />
      {/* glass outline */}
      <Path
        d={`M ${x + 3} ${y} L ${x + w - 3} ${y} L ${x + w - 8} ${y + h} L ${x + 8} ${y + h} Z`}
        stroke={INK}
        strokeWidth={3}
        fill="none"
        strokeLinejoin="round"
      />
    </G>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.lg, alignItems: 'stretch', gap: spacing.md },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  crumb: { ...typography.label, color: MUTED },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2, textAlign: 'center', marginTop: spacing.md },
  title: { ...typography.heading, color: INK, textAlign: 'center', marginTop: spacing.xs },
  heroStage: { height: HRING + 24, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
  ripple: { position: 'absolute', width: HRING, height: HRING, borderRadius: HRING / 2, borderWidth: 3, borderColor: TEAL },
  ringWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringCenterText: { ...typography.caption, color: INK, fontWeight: '800', fontSize: 12 },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, textAlign: 'center' },
  chipsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm },
  chip: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: CARD,
    borderRadius: 24,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minWidth: 96,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  chipName: { ...typography.caption, color: INK, fontWeight: '700' },
  caption: { ...typography.body, color: INK, textAlign: 'center', fontStyle: 'italic', marginTop: spacing.lg },
  footnote: { ...typography.caption, color: MUTED, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  srOnly: { width: 1, height: 1, opacity: 0 },
  doneBtn: {
    backgroundColor: VIOLET,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: VIOLET,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  doneBtnDone: { backgroundColor: '#EDE9FE', shadowOpacity: 0 },
  doneText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  doneTextDone: { color: VIOLET },
  connLink: { alignSelf: 'center', paddingVertical: spacing.sm },
  connLinkText: { ...typography.label, color: VIOLET, fontWeight: '700' },
  actions: { gap: spacing.sm, marginBottom: spacing.md },
  nextKicker: { ...typography.caption, color: MUTED, textAlign: 'center', fontWeight: '700' },
  timerBtn: {
    backgroundColor: VIOLET,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: VIOLET,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  timerBtnText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  logBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  logBtnText: { ...typography.label, color: MUTED, fontWeight: '700' },
});
