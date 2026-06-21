import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, AnimatedHero, DragonSprite, ConfettiBurst } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBattles } from '@/state/BattlesContext';
import { useCompleteActivity } from '@/state/useCompleteActivity';
import { useAbandonGuard } from '@/hooks/useAbandonGuard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getCelebrationTimings } from '@/lib/celebration';
import { battleStateAt } from '@/lib/battle';
import { getTechnique, workSeconds } from '@/lib/timeTechniques';
import { getDragon } from '@/data/dragons';
import { formatClock } from '@/lib/activityTimer';
import type { RootStackParamList } from '@/navigation/types';

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
}

/** Coins awarded for a victory: a per-habit bounty + a dragon bounty. */
function coinsFor(completed: number): number {
  return completed * 10 + 25;
}

export function BattleScreen({ route, navigation }: Props) {
  const { t } = useTranslation('battle');
  const { questIds, techniqueId, customMin, dragonId, dragonName } = route.params;
  const { quests, character } = useGame();
  const { recordVictory } = useBattles();
  const complete = useCompleteActivity();
  const guardAbandon = useAbandonGuard();
  const reduced = useReducedMotion();
  const timings = getCelebrationTimings(reduced);

  const technique = getTechnique(techniqueId);
  const totalSec = useMemo(() => workSeconds(technique, customMin), [technique, customMin]);
  const dragon = useMemo(() => getDragon(dragonId, dragonName), [dragonId, dragonName]);
  const dragonDisplayName = t('dragons:' + dragon.id + '.name', { defaultValue: dragon.name });
  const dragonTaunt = t('dragons:' + dragon.id + '.taunt', { defaultValue: dragon.taunt });
  const dragonVictory = t('dragons:' + dragon.id + '.victory', { defaultValue: dragon.victory });
  const accent = dragon.colorId === 'teal' ? TEAL : VIOLET;
  const battleQuests = useMemo(
    () => questIds.map((id) => quests.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q),
    [questIds, quests],
  );

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VictoryResult | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wonRef = useRef(false);

  const state = battleStateAt(totalSec, elapsed);
  const won = result !== null;

  const stop = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
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
    const method = technique.countsUp ? 'timer' : 'pomodoro';
    const per = battleQuests.length > 0 ? Math.round(elapsed / battleQuests.length) : 0;
    let completed = 0;
    let totalXp = 0;
    for (const q of battleQuests) {
      const reward = await complete(q, { method, durationSec: per });
      if (reward) {
        completed += 1;
        totalXp += reward.totalXp;
      }
    }
    const coins = coinsFor(completed);
    await recordVictory(dragon.id, coins);
    setResult({ completed, selected: battleQuests.length, totalXp, coins });
  }, [stop, reduced, technique.countsUp, battleQuests, elapsed, complete, recordVictory, dragon.id]);

  // Auto-slay when a timed block fully elapses.
  useEffect(() => {
    if (running && totalSec !== null && elapsed >= totalSec) void winBattle();
  }, [running, totalSec, elapsed, winBattle]);

  const start = useCallback(() => {
    if (running || won) return;
    setRunning(true);
    tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [running, won]);

  const pause = useCallback(() => {
    stop();
    setRunning(false);
  }, [stop]);

  if (battleQuests.length === 0) {
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

  const onRetreat = () => {
    if (
      guardAbandon({
        kind: 'battle-retreat',
        ctx: { battleRunning: running },
        dragonId,
        ...(dragonName ? { dragonName } : {}),
        ...(battleQuests[0] ? { questId: battleQuests[0].id } : {}),
        onProceed: () => navigation.goBack(),
      })
    )
      return;
    navigation.goBack();
  };

  const clock = totalSec === null ? formatClock(elapsed) : formatClock(state.remainingSec ?? 0);

  return (
    <ScreenContainer backgroundColor={BG}>
      {won && timings.confetti && <ConfettiBurst />}
      <View style={styles.topbar}>
        {!won && (
          <Pressable onPress={onRetreat} accessibilityRole="button" accessibilityLabel={t('battle.retreatA11y')} hitSlop={12}>
            <Text style={styles.retreat}>{t('battle.retreat')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.stage}>
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
            </View>
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

            <Text style={styles.clock} accessibilityLabel={totalSec === null ? t('battle.clockElapsedA11y', { clock }) : t('battle.clockRemainingA11y', { clock })}>
              {clock}
            </Text>
            <Text style={styles.clockSub}>
              {t('techniques:' + technique.id + '.name', { defaultValue: technique.name })}
              {totalSec === null ? t('battle.countUp') : ''}
            </Text>
          </>
        )}
      </View>

      {won ? (
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('battle.doneA11y')} style={[styles.primaryBtn, { backgroundColor: accent }]}>
          <Text style={styles.primaryText}>{t('battle.done')}</Text>
        </Pressable>
      ) : (
        <View style={styles.controls}>
          <Pressable
            onPress={running ? pause : start}
            accessibilityRole="button"
            accessibilityLabel={running ? t('battle.pauseA11y') : elapsed > 0 ? t('battle.resumeA11y') : t('battle.startBattleA11y')}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
          >
            <Text style={styles.primaryText}>{running ? t('battle.pause') : elapsed > 0 ? t('battle.resume') : t('battle.start')}</Text>
          </Pressable>
          {elapsed > 0 && (
            <Pressable
              onPress={() => void winBattle()}
              accessibilityRole="button"
              accessibilityLabel={t('battle.finishA11y')}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>{t('battle.finish')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  topbar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 28, paddingVertical: spacing.sm },
  retreat: { ...typography.label, color: MUTED, fontWeight: '600' },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  kicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  dragonName: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center', textTransform: 'capitalize' },
  taunt: { ...typography.body, color: MUTED, fontStyle: 'italic', textAlign: 'center' },

  healthTrack: { width: '70%', height: 10, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden', marginTop: spacing.md },
  healthFill: { height: 10, borderRadius: 999 },

  heroRow: { marginTop: spacing.lg },
  clock: { ...typography.heading, color: INK, fontWeight: '900', fontSize: 48, marginTop: spacing.sm },
  clockSub: { ...typography.caption, color: MUTED },

  victory: { ...typography.heading, fontWeight: '900' },
  victoryLine: { ...typography.body, color: INK, textAlign: 'center', paddingHorizontal: spacing.lg },
  summary: { marginTop: spacing.md, backgroundColor: CARD, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', gap: 4 },
  summaryText: { ...typography.body, color: INK, fontWeight: '700' },
  summaryCoins: { ...typography.label, color: '#B8860B', fontWeight: '800' },

  controls: { gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: { borderRadius: radii.pill, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  primaryText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  secondaryBtn: { borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E6E0' },
  secondaryText: { ...typography.label, color: INK, fontWeight: '700' },
  sub: { ...typography.body, color: MUTED },
});
