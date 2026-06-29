/**
 * PrepareRite — a short "mind & soul" rite before facing a dragon. Pick one of a
 * few tiny experiences (breathe / vow / recall a win / charge your Wisp); finishing
 * marks the next battle "prepared" (a small victory bonus). Optional + additive: the
 * normal setup→battle flow is untouched if skipped.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useBattles } from '@/state/BattlesContext';
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

export function PrepareRiteScreen({ route, navigation }: Props) {
  const { dragonId, dragonName, category } = route.params;
  const { t } = useTranslation(['battle', 'dragons']);
  const { setPreparedRite } = useBattles();
  const { settings } = useSettings();
  const reduced = useReducedMotion();

  const [rite, setRite] = useState<RiteId>(defaultRiteFor(dragonId, category));
  const [charge, setCharge] = useState(0);

  const dragon = dragonName ?? t('dragons:' + dragonId + '.name', { defaultValue: t('rites.theDragon') });

  // Breathing orb — a slow 4s-in / 4s-out loop (skipped under reduced motion).
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setCharge(0);
    if (rite !== 'breathe' || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
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

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('rites.skip')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <View style={styles.chevronSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('rites.title')}</Text>
        <Text style={styles.facing}>{t('rites.facing', { dragon })}</Text>

        <View style={styles.stage}>
          {rite === 'breathe' && (
            <View style={styles.center}>
              <Animated.View style={[styles.orb, { transform: [{ scale }] }]} />
              <Text style={styles.riteBlurb}>{t('rites.breathe.blurb')}</Text>
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
              <Text style={styles.vowText}>{t('rites.recall.blurb')}</Text>
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
        </View>

        <Pressable
          onPress={finish}
          disabled={rite === 'charge' && charge < CHARGE_TARGET}
          accessibilityRole="button"
          style={[styles.primary, rite === 'charge' && charge < CHARGE_TARGET && styles.primaryOff]}
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

  stage: { minHeight: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 24, padding: spacing.lg, borderWidth: 1, borderColor: TRACK },
  center: { alignItems: 'center', gap: spacing.md, width: '100%' },
  orb: { width: 120, height: 120, borderRadius: 999, backgroundColor: TEAL, opacity: 0.85 },
  riteBlurb: { ...typography.body, color: MUTED, textAlign: 'center' },
  vowMark: { fontSize: 48 },
  vowText: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center' },

  chargeTrack: { alignSelf: 'stretch', height: 12, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden' },
  chargeFill: { height: 12, borderRadius: 999, backgroundColor: VIOLET },
  chargeBtn: { backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderWidth: 1, borderColor: '#E2DBFB' },
  chargeBtnText: { ...typography.label, color: VIOLET, fontWeight: '900' },

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
