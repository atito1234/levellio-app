import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, AnimatedHero, RatingPrompt } from '@/components';
import type { RatingValue } from '@/types';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { activityTiming, formatClock } from '@/lib/activityTimer';
import { pickFocusQuote } from '@/data/focusQuotes';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityTimer'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const TEAL = '#16C8A8';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#E8E6E0';
const RING = 248;
const STROKE = 18;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function ActivityTimerScreen({ route, navigation }: Props) {
  const { quests, character } = useGame();
  const complete = useCompleteActivity();
  const quest = quests.find((q) => q.id === route.params.questId);
  // One stable, science-grounded quote per focus session.
  const quote = useMemo(() => pickFocusQuote(route.params.questId.length + new Date().getDate()), [route.params.questId]);

  const timing = quest ? activityTiming(quest) : null;
  const totalSec = (timing?.minutes ?? 25) * 60;

  const [remaining, setRemaining] = useState(totalSec);
  const [running, setRunning] = useState(false);
  const [logged, setLogged] = useState(false);
  // When the habit asks for a rating, a finish first parks the duration here and
  // opens the prompt; the real completion runs once a rating is picked/skipped.
  const [pendingSec, setPendingSec] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => stopTick, [stopTick]);

  // Persist the completion (optionally with a rating) and hand off to celebration.
  const commit = useCallback(
    async (durationSec: number, rating?: RatingValue) => {
      if (logged || !quest || !timing) return;
      setLogged(true);
      const reward = await complete(quest, { method: timing.method, durationSec, ...(rating ? { rating } : {}) });
      if (reward?.leveledUp) navigation.navigate('QuestComplete', { reward });
    },
    [logged, quest, timing, complete, navigation],
  );

  const finish = useCallback(
    async (durationSec: number) => {
      stopTick();
      setRunning(false);
      if (logged || !quest || !timing) return;
      // Rating habits: pause for the quick 1–5 self-report before committing.
      if (quest.metric === 'rating') {
        setPendingSec(durationSec);
        return;
      }
      await commit(durationSec);
    },
    [stopTick, logged, quest, timing, commit],
  );

  // The "alarm": when the countdown reaches zero, auto-log the full session.
  useEffect(() => {
    if (running && remaining <= 0) void finish(totalSec);
  }, [running, remaining, totalSec, finish]);

  const start = useCallback(() => {
    if (running || remaining <= 0) return;
    setRunning(true);
    intervalRef.current = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
  }, [running, remaining]);

  const pause = useCallback(() => {
    stopTick();
    setRunning(false);
  }, [stopTick]);

  if (!quest || !timing) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <View style={styles.center}>
          <Text style={styles.sub}>This activity is no longer available.</Text>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Go back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const elapsed = totalSec - remaining;
  const progress = totalSec > 0 ? elapsed / totalSec : 0;
  const offset = CIRC * (1 - progress);
  const accent = timing.method === 'pomodoro' ? VIOLET : TEAL;

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.kicker}>{running ? 'IN FOCUS' : 'FOCUS SESSION'}</Text>
        {character && (
          <AnimatedHero
            presentation={character.presentation}
            tier={character.tier}
            kitId={character.kitId}
            size={84}
            animate={running && !logged}
          />
        )}
        <Text style={styles.title} accessibilityRole="header">
          {quest.title}
        </Text>
        <Text style={styles.quote} accessibilityLabel={quote.text}>
          “{quote.text}”
        </Text>

        <View style={styles.ringStage} accessibilityLabel={`${formatClock(remaining)} remaining`}>
          <Svg width={RING} height={RING} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={TRACK} strokeWidth={STROKE} fill="none" />
            <G transform={`rotate(-90, ${RING / 2}, ${RING / 2})`}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke={accent}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
              />
            </G>
          </Svg>
          <View style={styles.clockWrap} pointerEvents="none">
            <Text style={styles.clock}>{logged ? '✓' : formatClock(remaining)}</Text>
            <Text style={styles.clockSub}>{logged ? 'Logged' : running ? 'in progress' : 'ready'}</Text>
          </View>
        </View>
      </View>

      {logged ? (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Done" style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <Text style={styles.primaryText}>Done — rings moved ✓</Text>
        </Pressable>
      ) : (
        <View style={styles.controls}>
          <Pressable
            onPress={running ? pause : start}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause timer' : 'Start timer'}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
          >
            <Text style={styles.primaryText}>{running ? 'Pause' : remaining < totalSec ? 'Resume' : 'Start'}</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable
              onPress={() => void finish(elapsed)}
              accessibilityRole="button"
              accessibilityLabel="Finish and log now"
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Finish &amp; log</Text>
            </Pressable>
            <Pressable
              onPress={() => void finish(0)}
              accessibilityRole="button"
              accessibilityLabel="Log without timing"
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Just log it</Text>
            </Pressable>
          </View>
        </View>
      )}

      <RatingPrompt
        visible={pendingSec !== null}
        title={quest.title}
        onSelect={(rating) => {
          const sec = pendingSec ?? 0;
          setPendingSec(null);
          void commit(sec, rating);
        }}
        onSkip={() => {
          const sec = pendingSec ?? 0;
          setPendingSec(null);
          void commit(sec);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  topbar: { flexDirection: 'row', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  title: { ...typography.heading, color: INK, textAlign: 'center' },
  sub: { ...typography.body, color: MUTED },
  quote: { ...typography.body, color: MUTED, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  ringStage: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  clockWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  clock: { ...typography.heading, color: INK, fontWeight: '900', fontSize: 52 },
  clockSub: { ...typography.caption, color: MUTED },
  controls: { gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: { borderRadius: radii.pill, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  primaryText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  secondaryRow: { flexDirection: 'row', gap: spacing.md },
  secondaryBtn: { flex: 1, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E0' },
  secondaryText: { ...typography.label, color: INK },
});
