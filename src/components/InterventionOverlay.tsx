/**
 * "Think twice" overlay — a futuristic pause shown when a user tries to quit/skip
 * something with stakes. Reframes the dragon's taunt and poses one sharp Socratic
 * line, then offers "Face it" (→ the coaching encounter) or "Leave anyway" (→ the
 * deferred action). Mirrors MilestoneCelebration's mount + reduced-motion pattern.
 * Mounted once inside the NavigationContainer so it can navigate and overlay any
 * screen. Honest, no guilt-tripping — gold is NOT used (reserved for reward).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIntervention } from '@/state/InterventionContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { buildCoaching } from '@/lib/coaching';
import { getDragon } from '@/data/dragons';
import { spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const CARD = '#161427';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#C9BCFA';
const INK_ON_DARK = '#F4F2FF';
const MUTED_ON_DARK = '#A9A4C7';

export function InterventionOverlay() {
  const { t } = useTranslation('intervention');
  const { current, proceed, faceIt } = useIntervention();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    if (reduced) {
      scale.setValue(1);
    } else {
      scale.setValue(0);
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const dragon = getDragon(current.dragonId ?? 'procrastination', current.dragonName);
  // Dragon copy lives in the shared `dragons` namespace, keyed by dragon id.
  const taunt = t('dragons:' + dragon.id + '.taunt', { defaultValue: dragon.taunt });
  const plan = buildCoaching({ dragonId: current.dragonId ?? 'procrastination', goals: [] });
  const firstQuestion = plan.questions[0];
  // Localize the curated Socratic prompt by its stable id; fall back to English
  // text, then to the chrome fallback question if there is no question at all.
  const question = firstQuestion
    ? t('coachingContent:question.' + firstQuestion.id + '.text', { defaultValue: firstQuestion.text })
    : t('fallbackQuestion');

  const onFace = () => {
    const dragonId = current.dragonId ?? 'procrastination';
    const questId = current.questId;
    faceIt();
    navigation.navigate('CoachingEncounter', { dragonId, ...(questId ? { questId } : {}) });
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.scrim}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]} accessible accessibilityLiveRegion="polite" accessibilityLabel={t('cardA11y')}>
          <Text style={styles.kicker}>{t('kicker')}</Text>
          <Text style={styles.taunt}>{t('leavingNow', { taunt })}</Text>
          <Text style={styles.question}>{question}</Text>
          <Pressable onPress={onFace} accessibilityRole="button" accessibilityLabel={t('faceItA11y')} style={styles.faceBtn}>
            <Text style={styles.faceText}>{t('faceIt')}</Text>
          </Pressable>
          <Pressable onPress={proceed} accessibilityRole="button" accessibilityLabel={t('leaveAnywayA11y')} hitSlop={8} style={styles.leaveBtn}>
            <Text style={styles.leaveText}>{t('leaveAnyway')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1100, elevation: 1100 },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,14,30,0.66)', padding: spacing.xl },
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: VIOLET,
    shadowColor: VIOLET,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  kicker: { ...typography.label, color: VIOLET_SOFT, letterSpacing: 3, fontWeight: '800' },
  taunt: { ...typography.title, color: INK_ON_DARK, fontWeight: '800' },
  question: { ...typography.body, color: MUTED_ON_DARK },
  faceBtn: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  faceText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  leaveBtn: { alignItems: 'center', paddingVertical: spacing.xs },
  leaveText: { ...typography.label, color: MUTED_ON_DARK, fontWeight: '700' },
});
