/**
 * PrepareRite — short "mind & soul" rites before facing a dragon. Pick one of a few
 * tiny experiences (breathe / vow / recall a real past win / charge / first strike);
 * finishing marks the next battle "prepared" (a victory bonus). Optional + additive:
 * the normal setup→battle flow is untouched if skipped.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader } from '@/components';
import { spacing, typography } from '@/theme';
import { useBattles } from '@/state/BattlesContext';
import { useJournal } from '@/state/JournalContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/services/feedback/haptics';
import { useSettings } from '@/state/SettingsContext';
import { BATTLE_RITES, defaultRiteFor, type RiteId } from '@/data/battleRites';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrepareRite'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const VIOLET_SOFT = '#EDE9FE';

const CHARGE_TARGET = 8;
const STRIKE_TARGET = 6;
const randPct = (min: number, max: number) => `${Math.round(min + Math.random() * (max - min))}%` as const;

export function PrepareRiteScreen({ route, navigation }: Props) {
  const { dragonId, dragonName, category } = route.params;
  const { t } = useTranslation(['battle', 'dragons']);
  const { setPreparedRite } = useBattles();
  const { entries, entriesForDragon } = useJournal();
  const { settings } = useSettings();
  const reduced = useReducedMotion();

  const [rite, setRite] = useState<RiteId>(defaultRiteFor(dragonId, category));
  const [charge, setCharge] = useState(0);
  const [strikeHits, setStrikeHits] = useState(0);
  const [target, setTarget] = useState<{ top: string; left: string }>({ top: '40%', left: '40%' });
  const [breathIn, setBreathIn] = useState(true);

  const dragon = dragonName ?? t('dragons:' + dragonId + '.name', { defaultValue: t('rites.theDragon') });
  // Recall pulls a REAL past reflection (this dragon first, else most recent).
  const recallText = useMemo(() => {
    const e = entriesForDragon(dragonId)[0] ?? entries[0];
    return e?.text?.trim() || t('rites.recall.blurb');
  }, [entriesForDragon, entries, dragonId, t]);

  // Reset per-rite state whenever the rite changes.
  useEffect(() => {
    setCharge(0);
    setStrikeHits(0);
    if (rite === 'strike') setTarget({ top: randPct(8, 70), left: randPct(6, 78) });
  }, [rite]);

  // Breathing orb — slow 4s in / 4s out loop + a phase label (skipped if reduced).
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (rite !== 'breathe' || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    const phase = setInterval(() => setBreathIn((v) => !v), 4000);
    return () => {
      loop.stop();
      clearInterval(phase);
    };
  }, [rite, reduced, scale]);

  const finish = () => {
    setPreparedRite(rite);
    haptics.success(settings.hapticsEnabled);
    navigation.goBack();
  };

  const tapCharge = () => {
    haptics.tap(settings.hapticsEnabled);
    setCharge((c) => Math.min(CHARGE_TARGET, c + 1));
  };

  const hitTarget = () => {
    haptics.tap(settings.hapticsEnabled);
    setStrikeHits((h) => Math.min(STRIKE_TARGET, h + 1));
    setTarget({ top: randPct(8, 70), left: randPct(6, 78) });
  };

  const chargeReady = rite === 'charge' && charge >= CHARGE_TARGET;
  const strikeReady = rite === 'strike' && strikeHits >= STRIKE_TARGET;
  const finishDisabled = (rite === 'charge' && !chargeReady) || (rite === 'strike' && !strikeReady);

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader onBack={() => navigation.goBack()} backLabel={t('rites.skip')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('rites.title')}</Text>
        <Text style={styles.facing}>{t('rites.facing', { dragon })}</Text>

        <View style={styles.stage}>
          {rite === 'breathe' && (
            <View style={styles.center}>
              <Animated.View style={[styles.orb, { transform: [{ scale }] }]} />
              <Text style={styles.phase}>{reduced ? t('rites.breathe.blurb') : breathIn ? t('rites.breathe.in') : t('rites.breathe.out')}</Text>
            </View>
          )}
          {rite === 'vow' && (
            <View style={styles.center}>
              <Text style={styles.vowMark}>🔥</Text>
              <Text style={styles.vowText}>“{t('rites.vow.blurb')}”</Text>
            </View>
          )}
          {rite === 'recall' && (
            <View style={styles.center}>
              <Text style={styles.vowMark}>🏅</Text>
              <Text style={styles.vowText}>“{recallText}”</Text>
            </View>
          )}
          {rite === 'charge' && (
            <View style={styles.center}>
              <Text style={styles.vowMark}>⚡</Text>
              <Text style={styles.riteBlurb}>{t('rites.charge.blurb')}</Text>
              <View style={styles.chargeTrack}>
                <View style={[styles.chargeFill, { width: `${Math.round((charge / CHARGE_TARGET) * 100)}%` }]} />
              </View>
              <Pressable onPress={tapCharge} accessibilityRole="button" accessibilityLabel={t('rites.charge.tap')} style={styles.chargeBtn}>
                <Text style={styles.chargeBtnText}>{t('rites.charge.tap')}</Text>
              </Pressable>
            </View>
          )}
          {rite === 'strike' && (
            <View style={styles.strikeStage}>
              <Text style={styles.strikeHint}>{t('rites.strike.blurb')}</Text>
              <Text style={styles.strikeCount}>{t('rites.strike.hits', { hits: strikeHits, total: STRIKE_TARGET })}</Text>
              {!strikeReady && (
                <Pressable
                  onPress={hitTarget}
                  accessibilityRole="button"
                  accessibilityLabel={t('rites.strike.tap')}
                  style={[styles.strikeTarget, { top: target.top as any, left: target.left as any }]}
                >
                  <Text style={styles.strikeTargetText}>🎯</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={finish}
          disabled={finishDisabled}
          accessibilityRole="button"
          style={[styles.primary, finishDisabled && styles.primaryOff]}
        >
          <Text style={styles.primaryText}>{t('rites.' + rite + '.cta')}</Text>
        </Pressable>

        {/* Switch to a different rite. */}
        <Text style={styles.switchLabel}>{t('rites.switch')}</Text>
        <View style={styles.switchRow}>
          {BATTLE_RITES.map((r) => {
            const on = r.id === rite;
            return (
              <Pressable
                key={r.id}
                onPress={() => setRite(r.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('rites.' + r.id + '.title')}
                style={[styles.switchChip, on && styles.switchChipOn]}
              >
                <Text style={[styles.switchChipText, on && styles.switchChipTextOn]}>{r.emoji} {t('rites.' + r.id + '.title')}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  h1: { ...typography.heading, color: INK, fontWeight: '800' },
  facing: { ...typography.body, color: MUTED },

  stage: { minHeight: 260, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 24, padding: spacing.lg, borderWidth: 1, borderColor: TRACK },
  center: { alignItems: 'center', gap: spacing.md, width: '100%' },
  orb: { width: 120, height: 120, borderRadius: 999, backgroundColor: TEAL, opacity: 0.85 },
  phase: { ...typography.title, color: MUTED, fontWeight: '700' },
  riteBlurb: { ...typography.body, color: MUTED, textAlign: 'center' },
  vowMark: { fontSize: 48 },
  vowText: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center' },

  chargeTrack: { alignSelf: 'stretch', height: 12, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden' },
  chargeFill: { height: 12, borderRadius: 999, backgroundColor: VIOLET },
  chargeBtn: { backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#E2DBFB' },
  chargeBtnText: { ...typography.label, color: VIOLET, fontWeight: '900' },

  strikeStage: { alignSelf: 'stretch', flex: 1, minHeight: 220, width: '100%' },
  strikeHint: { ...typography.body, color: MUTED, textAlign: 'center' },
  strikeCount: { ...typography.label, color: VIOLET, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  strikeTarget: { position: 'absolute', width: 52, height: 52, borderRadius: 999, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: VIOLET },
  strikeTargetText: { fontSize: 26 },

  primary: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  primaryOff: { opacity: 0.4 },
  primaryText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },

  switchLabel: { ...typography.label, color: MUTED, letterSpacing: 1, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchChip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  switchChipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  switchChipText: { ...typography.label, color: MUTED, fontWeight: '700' },
  switchChipTextOn: { color: VIOLET, fontWeight: '800' },
});
