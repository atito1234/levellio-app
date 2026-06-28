import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ScreenContainer, AnimatedHero, RatingPrompt } from '@/components';
import type { RatingValue } from '@/types';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { activityTiming, formatClock, isVerifiedDuration } from '@/lib/activityTimer';
import { ACTIVITY_VERIFICATION_ENABLED, FOCUS_LOCK_ENABLED } from '@/config/features';
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
  const { t } = useTranslation('activityTimer');
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
  const [wasVerified, setWasVerified] = useState(false);
  // When the habit asks for a rating, a finish first parks the duration here and
  // opens the prompt; the real completion runs once a rating is picked/skipped.
  const [pendingSec, setPendingSec] = useState<number | null>(null);
  const [pendingVerified, setPendingVerified] = useState(false);
  const [locked, setLocked] = useState(false);
  const guardAbandon = useAbandonGuard();
  const allowLeave = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Lock is active once engaged and until the session is logged — it survives a
  // pause so the user can't slip out by pausing.
  const lockActive = FOCUS_LOCK_ENABLED && locked && !logged;

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Release the screen lock whenever the countdown stops.
    void deactivateKeepAwake();
  }, []);

  useEffect(() => stopTick, [stopTick]);

  // Persist the completion (optionally with a rating) and hand off to celebration.
  const commit = useCallback(
    async (durationSec: number, verified: boolean, rating?: RatingValue) => {
      if (logged || !quest || !timing) return;
      setLogged(true);
      setWasVerified(verified);
      const reward = await complete(quest, {
        method: timing.method,
        durationSec,
        ...(rating ? { rating } : {}),
        ...(ACTIVITY_VERIFICATION_ENABLED && verified ? { verified: true } : {}),
      });
      if (reward?.leveledUp) navigation.navigate('QuestComplete', { reward });
    },
    [logged, quest, timing, complete, navigation],
  );

  const finish = useCallback(
    async (durationSec: number, verified: boolean) => {
      stopTick();
      setRunning(false);
      if (logged || !quest || !timing) return;
      // Rating habits: pause for the quick 1–5 self-report before committing.
      if (quest.metric === 'rating') {
        setPendingSec(durationSec);
        setPendingVerified(verified);
        return;
      }
      await commit(durationSec, verified);
    },
    [stopTick, logged, quest, timing, commit],
  );

  // The "alarm": when the countdown reaches zero, auto-log the full (verified) session.
  useEffect(() => {
    if (running && remaining <= 0) void finish(totalSec, true);
  }, [running, remaining, totalSec, finish]);

  // --- Focus Lock: block leaving a locked, unfinished session ----------------
  const attemptLeave = useCallback(() => {
    const intervened = guardAbandon({
      kind: 'activity-locked-exit',
      ctx: { focusLockedRunning: true },
      ...(quest ? { questId: quest.id } : {}),
      onProceed: () => {
        allowLeave.current = true;
        setLocked(false);
        navigation.goBack();
      },
    });
    if (!intervened) {
      allowLeave.current = true;
      setLocked(false);
      navigation.goBack();
    }
  }, [guardAbandon, quest, navigation]);

  // Disable the iOS swipe-back while locked.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !lockActive });
  }, [lockActive, navigation]);

  // Intercept back/pop (chevron, swipe, programmatic) while locked.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!lockActive || allowLeave.current) return;
      e.preventDefault();
      attemptLeave();
    });
    return unsub;
  }, [navigation, lockActive, attemptLeave]);

  // Android hardware back while locked.
  useEffect(() => {
    if (!lockActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      attemptLeave();
      return true;
    });
    return () => sub.remove();
  }, [lockActive, attemptLeave]);

  const start = useCallback(() => {
    if (running || remaining <= 0) return;
    setRunning(true);
    // Lock the screen on so a timed activity must actually be lived through.
    void activateKeepAwakeAsync();
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
          <Text style={styles.sub}>{t('unavailable')}</Text>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>{t('goBack')}</Text>
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
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.kicker}>{running ? t('inFocus') : t('focusSession')}</Text>
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

        <View style={styles.ringStage} accessibilityLabel={t('remainingA11y', { time: formatClock(remaining) })}>
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
            <Text style={styles.clockSub}>{logged ? t('logged') : running ? t('inProgress') : t('ready')}</Text>
            {logged && ACTIVITY_VERIFICATION_ENABLED && (
              <Text style={[styles.verifyTag, wasVerified ? styles.verifyOk : styles.verifySelf]}>
                {wasVerified ? t('verified') : t('selfReported')}
              </Text>
            )}
          </View>
        </View>
      </View>

      {logged ? (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('done')} style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <Text style={styles.primaryText}>{t('doneRingsMoved')}</Text>
        </Pressable>
      ) : (
        <View style={styles.controls}>
          <Pressable
            onPress={running ? pause : start}
            accessibilityRole="button"
            accessibilityLabel={running ? t('pauseTimerA11y') : t('startTimerA11y')}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
          >
            <Text style={styles.primaryText}>{running ? t('pause') : remaining < totalSec ? t('resume') : t('start')}</Text>
          </Pressable>

          {/* Focus Lock: while locked, the early-exit shortcuts are hidden — the
              only way out is to finish or go through the "end early?" prompt. */}
          {FOCUS_LOCK_ENABLED && (
            lockActive ? (
              <Pressable onPress={attemptLeave} accessibilityRole="button" accessibilityLabel={t('endEarlyA11y')} style={styles.lockRow}>
                <Text style={styles.lockedText}>{t('lockedEndEarly')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setLocked(true)} accessibilityRole="button" accessibilityLabel={t('lockMeIn')} style={styles.lockRow}>
                <Text style={[styles.lockText, { color: accent }]}>{t('lockMeIn')}</Text>
              </Pressable>
            )
          )}

          {!lockActive && (
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => void finish(elapsed, isVerifiedDuration(elapsed, totalSec))}
                accessibilityRole="button"
                accessibilityLabel={t('finishAndLogA11y')}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>{t('finishAndLog')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void finish(0, false)}
                accessibilityRole="button"
                accessibilityLabel={t('justLogItA11y')}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>{t('justLogIt')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <RatingPrompt
        visible={pendingSec !== null}
        title={quest.title}
        onSelect={(rating) => {
          const sec = pendingSec ?? 0;
          setPendingSec(null);
          void commit(sec, pendingVerified, rating);
        }}
        onSkip={() => {
          const sec = pendingSec ?? 0;
          setPendingSec(null);
          void commit(sec, pendingVerified);
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
  verifyTag: { ...typography.caption, fontWeight: '800', marginTop: 4 },
  verifyOk: { color: '#5C9A1B' },
  verifySelf: { color: MUTED },
  lockRow: { alignItems: 'center', paddingVertical: spacing.sm },
  lockText: { ...typography.label, fontWeight: '800' },
  lockedText: { ...typography.label, color: MUTED, fontWeight: '700' },
  controls: { gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: { borderRadius: radii.pill, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  primaryText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  secondaryRow: { flexDirection: 'row', gap: spacing.md },
  secondaryBtn: { flex: 1, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E0' },
  secondaryText: { ...typography.label, color: INK },
});
