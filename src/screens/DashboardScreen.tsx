import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, G } from 'react-native-svg';
import { CapacityRing, HeroAvatar, ScreenContainer } from '@/components';
import { BucketIcon } from '@/components/BucketIcon';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { dayProgress, groupHabitsIntoRails, pickFocusHabit, type HabitRail } from '@/lib/dashboard';
import { CATEGORY_META } from '@/lib/categories';
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

/**
 * Home — the ring-first "Today billboard". Replaces the old checklist home in
 * place, wired to the real GameContext (quests, streak, level, completion) and
 * the real Day-12 buckets. Neuropsychology applied (commented inline):
 * Zeigarnik, goal-gradient, von Restorff, Hick, Fitts, Gestalt, fluency.
 */
export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { character, quests, completeQuest, suggestQuest, status } = useGame();
  const { recordContribution, buckets, assignments } = useBuckets();
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
  const focus = useMemo(() => pickFocusHabit(quests), [quests]);
  const rails = useMemo(() => groupHabitsIntoRails(quests, buckets, assignments), [quests, buckets, assignments]);

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

  const handleComplete = useCallback(
    async (questId: string) => {
      const quest = quests.find((q) => q.id === questId);
      const reward = await completeQuest(questId);
      if (reward) {
        await recordContribution({ id: questId, category: quest?.category, difficulty: quest?.difficulty, xp: reward.totalXp });
        navigation.navigate('QuestComplete', { reward });
      }
    },
    [quests, completeQuest, recordContribution, navigation],
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

  return (
    <ScreenContainer backgroundColor={BG} noPadding edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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

        {/* Hero billboard — Zeigarnik: a large open ring pulls completion. */}
        <View style={styles.billboard}>
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
              <Text style={styles.ringPct}>{progress.pct}%</Text>
              <Text style={styles.ringSub}>{progress.done} of {progress.total} today</Text>
            </View>
          </View>

          {focus ? (
            <>
              <Text style={styles.focusName} numberOfLines={2}>
                {focus.title}
              </Text>
              {/* Fitts: large, full-width, thumb-reachable primary action. */}
              <Pressable
                onPress={() => handleComplete(focus.id)}
                accessibilityRole="button"
                accessibilityLabel={`Do it now: ${focus.title}`}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Do it now</Text>
              </Pressable>
            </>
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
        </View>

        {/* Quick actions — keeps every feature, low clutter (Hick's law). */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          <QuickChip label="＋ New" onPress={() => navigation.navigate('QuestEditor')} />
          <QuickChip label="📚 Library" onPress={() => navigation.navigate('HabitLibrary')} />
          <QuickChip label="🗂 Buckets" onPress={() => navigation.navigate('Organize')} />
          <QuickChip label="💧 Ripple" onPress={() => navigation.navigate('Ripple', { actionId: 'water' })} />
          <QuickChip label="🔗 Connections" onPress={() => navigation.navigate('Connections')} />
          <QuickChip label={suggesting ? '…' : '✨ Suggest'} onPress={handleSuggest} />
        </ScrollView>

        {/* Rails — Gestalt grouping: each life-area reads as one coherent row. */}
        {rails.map((rail) => (
          <Rail
            key={rail.id}
            rail={rail}
            buckets={buckets}
            onComplete={handleComplete}
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
  onComplete,
  onEdit,
}: {
  rail: HabitRail;
  buckets: ReturnType<typeof useBuckets>['buckets'];
  onComplete: (id: string) => void;
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
          <HabitCard key={h.id} quest={h} onComplete={onComplete} onEdit={onEdit} />
        ))}
      </ScrollView>
    </View>
  );
}

function HabitCard({
  quest,
  onComplete,
  onEdit,
}: {
  quest: Quest;
  onComplete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const done = quest.completed;
  // Honest: a binary habit is 0% (open ring, Zeigarnik) or 100% (gold win).
  return (
    <Pressable
      onPress={() => (done ? undefined : onComplete(quest.id))}
      onLongPress={() => onEdit(quest.id)}
      accessibilityRole="button"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${quest.title}, ${done ? 'completed' : 'not done'}`}
      accessibilityHint={done ? 'Long press to edit' : 'Double tap to complete, long press to edit'}
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
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  billboardKicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  ringStage: { width: HRING, height: HRING, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.sm },
  glow: { position: 'absolute', width: HRING - 30, height: HRING - 30, borderRadius: HRING, opacity: 0.08 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringPct: { ...typography.heading, color: INK, fontWeight: '900', fontSize: 40 },
  ringSub: { ...typography.caption, color: MUTED },
  focusName: { ...typography.title, color: INK, textAlign: 'center', fontWeight: '700' },
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
