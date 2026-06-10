import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, PrimaryButton } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { HeroPresentation } from '@/types';
import { backend } from '@/services/backend';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

interface Slide {
  badge: string;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    badge: 'WELCOME',
    title: 'Turn real life into an epic quest',
    body: 'Habits, workouts, and goals become quests that level up your hero — from idea to lasting change.',
    accent: colors.identity,
  },
  {
    badge: 'HOW IT WORKS',
    title: 'Complete quests, earn XP',
    body: 'Easy, medium, and hard quests award XP. Keep a streak to multiply your rewards up to +100%.',
    accent: colors.action,
  },
  {
    badge: 'GROW',
    title: 'Rise from Novice to Luminary',
    body: 'Level up your hero and evolve your Wisp companion from a Spark into a Phoenixling.',
    accent: colors.reward,
  },
];

const PRESENTATIONS: { id: HeroPresentation; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'neutral', label: 'Neutral' },
];

/**
 * Day-4 onboarding flow: 3 value-prop slides, then a hero presentation choice.
 * On finish, signs in (mock backend), persists the choice, and enters the app.
 */
export function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [presentation, setPresentation] = useState<HeroPresentation>('neutral');
  const [busy, setBusy] = useState(false);

  const isChoiceStep = step === SLIDES.length;
  const lastIndex = SLIDES.length; // choice step index
  const progress = (step + 1) / (SLIDES.length + 1);

  const handleNext = () => setStep((s) => Math.min(s + 1, lastIndex));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleBegin = async () => {
    try {
      setBusy(true);
      const user = await backend.signInAnonymously();
      const character = await backend.loadCharacter(user.uid);
      if (character) {
        await backend.saveCharacter(user.uid, { ...character, presentation });
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } finally {
      setBusy(false);
    }
  };

  const slide = SLIDES[Math.min(step, SLIDES.length - 1)]!;

  return (
    <ScreenContainer>
      {/* Progress bar */}
      <View style={styles.progressTrack} accessibilityRole="progressbar">
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.body}>
        {isChoiceStep ? (
          <View style={styles.choiceWrap}>
            <Text style={styles.badge}>YOUR HERO</Text>
            <Text style={styles.title}>Choose your hero</Text>
            <Text style={styles.subtitle}>
              Same heroic silhouette — pick the presentation that feels like you. You can change this
              anytime.
            </Text>

            <View style={styles.options}>
              {PRESENTATIONS.map((p) => {
                const selected = presentation === p.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Hero presentation: ${p.label}`}
                    onPress={() => setPresentation(p.id)}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={[styles.avatar, selected && styles.avatarSelected]}>
                      <Text style={styles.avatarGlyph}>★</Text>
                    </View>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.slide}>
            <View
              style={[styles.hero, { backgroundColor: slide.accent }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Text style={styles.heroGlyph}>{['✦', '⚔', '✺'][step] ?? '✦'}</Text>
            </View>
            <Text style={[styles.badge, { color: slide.accent }]}>{slide.badge}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.body}</Text>
          </View>
        )}
      </View>

      {/* Dots */}
      <View style={styles.dots} accessibilityElementsHidden>
        {Array.from({ length: SLIDES.length + 1 }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, { width: i === step ? 24 : 8 }]}
          />
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isChoiceStep ? (
          <PrimaryButton
            label="Begin your journey"
            variant="action"
            onPress={handleBegin}
            loading={busy}
          />
        ) : (
          <PrimaryButton label="Continue" onPress={handleNext} />
        )}

        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={() => setStep(lastIndex)}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.violetSoft,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.identity,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    alignItems: 'center',
    gap: spacing.md,
  },
  hero: {
    width: 180,
    height: 180,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroGlyph: {
    fontSize: 72,
    color: colors.textOnBrand,
  },
  badge: {
    ...typography.label,
    letterSpacing: 1.5,
    color: colors.identity,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  choiceWrap: {
    gap: spacing.md,
    alignItems: 'center',
  },
  options: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  option: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 96,
  },
  optionSelected: {
    borderColor: colors.identity,
    backgroundColor: colors.violetSoft,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: colors.identity,
  },
  avatarGlyph: {
    fontSize: 24,
    color: colors.textOnBrand,
  },
  optionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  optionLabelSelected: {
    color: colors.violetDeep,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.violetMuted,
  },
  dotActive: {
    backgroundColor: colors.identity,
  },
  controls: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backText: {
    ...typography.label,
    color: colors.textMuted,
  },
});
