import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AnimatedHero,
  ConfettiBurst,
  DragonSprite,
  HeroAvatar,
  PressableScale,
  PrimaryButton,
  ScreenContainer,
  TextField,
  Wisp,
} from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { durations } from '@/theme/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useGame } from '@/state/GameContext';
import type { RootStackParamList } from '@/navigation/types';
import type { HeroPresentation } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type SlideKey = 'launch' | 'dragons' | 'grow';

const SLIDES: { key: SlideKey; accent: string; deep: string }[] = [
  { key: 'launch', accent: colors.identity, deep: colors.violetDeep },
  { key: 'dragons', accent: '#C0202C', deep: '#7A1620' },
  { key: 'grow', accent: colors.action, deep: colors.tealDeep },
];

const PRESENTATIONS: HeroPresentation[] = ['female', 'male', 'neutral'];

/** A cinematic first-run: board the ship, face your dragons, rise — then choose your hero. */
export function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation('onboarding');
  const reduced = useReducedMotion();
  const { startGame, setName } = useGame();
  const [step, setStep] = useState(0);
  const [presentation, setPresentation] = useState<HeroPresentation>('neutral');
  const [heroName, setHeroName] = useState('');
  const [busy, setBusy] = useState(false);

  const lastIndex = SLIDES.length; // the choice step
  const isChoice = step === lastIndex;
  const progress = (step + 1) / (SLIDES.length + 1);

  // Cross-fade + lift between steps.
  const anim = useRef(new Animated.Value(1)).current;
  const go = (next: number) => {
    if (reduced) {
      setStep(next);
      return;
    }
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: durations.slow, useNativeDriver: true }).start();
    });
  };

  const handleBegin = async () => {
    try {
      setBusy(true);
      await startGame(presentation);
      if (heroName.trim()) await setName(heroName);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } finally {
      setBusy(false);
    }
  };

  const slide = SLIDES[Math.min(step, SLIDES.length - 1)]!;
  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  return (
    <ScreenContainer>
      <View style={styles.progressTrack} accessibilityRole="progressbar">
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isChoice ? colors.identity : slide.accent }]} />
      </View>

      <View style={styles.body}>
        {isChoice ? (
          <Animated.View style={[styles.choiceWrap, animStyle]}>
            <Text style={[styles.badge, { color: colors.violetDeep }]}>{t('choose.badge')}</Text>
            <Text style={styles.title}>{t('choose.title')}</Text>
            <Text style={styles.subtitle}>{t('choose.subtitle')}</Text>
            <View style={styles.nameField}>
              <TextField
                label={t('choose.nameLabel')}
                value={heroName}
                onChangeText={setHeroName}
                placeholder={t('choose.namePlaceholder')}
                maxLength={40}
                returnKeyType="done"
              />
            </View>
            <View style={styles.options}>
              {PRESENTATIONS.map((p) => {
                const selected = presentation === p;
                return (
                  <PressableScale
                    key={p}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(`choose.${p}`)}
                    onPress={() => setPresentation(p)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <HeroAvatar presentation={p} tier="pathfinder" size={64} />
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{t(`choose.${p}`)}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.slide, animStyle]}>
            <View style={[styles.stage, { backgroundColor: slide.deep }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.halo, { backgroundColor: slide.accent }]} />
              {slide.key === 'launch' && <AnimatedHero presentation={presentation} tier="luminary" size={184} />}
              {slide.key === 'dragons' && <DragonSprite colorId="violet" size={168} />}
              {slide.key === 'grow' && <Wisp stage="phoenixling" size={132} />}
            </View>
            <Text style={[styles.badge, { color: slide.accent }]}>{t(`${slide.key}.badge`)}</Text>
            <Text style={styles.title}>{t(`${slide.key}.title`)}</Text>
            <Text style={styles.subtitle}>{t(`${slide.key}.body`)}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.dots} accessibilityElementsHidden>
        {Array.from({ length: SLIDES.length + 1 }).map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive, { width: i === step ? 24 : 8 }]} />
        ))}
      </View>

      <View style={styles.controls}>
        {isChoice ? (
          <PrimaryButton label={t('begin')} variant="action" onPress={() => void handleBegin()} loading={busy} />
        ) : (
          <PrimaryButton label={t('continue')} onPress={() => go(Math.min(step + 1, lastIndex))} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step > 0 ? t('back') : t('skip')}
          onPress={() => (step > 0 ? go(Math.max(step - 1, 0)) : go(lastIndex))}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{step > 0 ? t('back') : t('skip')}</Text>
        </Pressable>
      </View>

      {/* Launch flourish while entering the app. */}
      {busy && !reduced && <ConfettiBurst count={28} />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.violetSoft, overflow: 'hidden', marginTop: spacing.md },
  progressFill: { height: '100%', borderRadius: radii.pill },
  body: { flex: 1, justifyContent: 'center' },
  slide: { alignItems: 'center', gap: spacing.md },
  stage: {
    width: 240,
    height: 240,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  halo: { position: 'absolute', width: 150, height: 150, borderRadius: 999, opacity: 0.45 },
  badge: { ...typography.label, letterSpacing: 1.5 },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.sm },
  choiceWrap: { gap: spacing.md, alignItems: 'center' },
  nameField: { alignSelf: 'stretch', marginTop: spacing.sm },
  options: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  option: { alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, minWidth: 96 },
  optionSelected: { borderColor: colors.identity, backgroundColor: colors.violetSoft },
  optionLabel: { ...typography.label, color: colors.textSecondary },
  optionLabelSelected: { color: colors.violetDeep },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginVertical: spacing.lg },
  dot: { height: 8, borderRadius: radii.pill, backgroundColor: colors.violetMuted },
  dotActive: { backgroundColor: colors.identity },
  controls: { gap: spacing.sm, paddingBottom: spacing.md },
  backBtn: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  backText: { ...typography.label, color: colors.textMuted },
});
