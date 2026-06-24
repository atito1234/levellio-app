import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AnimatedHero,
  ConfettiBurst,
  PlusPlans,
  PressableScale,
  PrimaryButton,
  ScreenContainer,
} from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { durations } from '@/theme/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GOAL_TEMPLATES } from '@/data/goalTemplates';
import { useApplyStarterPlan } from '@/lib/onboarding/useApplyStarterPlan';
import type { StarterPlan } from '@/lib/onboarding/starterPlan';
import { requestAppReview } from '@/services/reviews/requestReview';
import { requestNotificationPermission } from '@/services/notifications/permission';
import type { RootStackParamList } from '@/navigation/types';
import type { HeroPresentation } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const STEPS = [
  'hook', 'attribution', 'focus', 'blocker', 'count', 'reminder', 'why',
  'choose', 'commit', 'rating', 'notify', 'building', 'reveal',
  'primeTrial', 'primeRemind', 'plans',
] as const;
type Step = (typeof STEPS)[number];

const BLOCKERS = ['procrastination', 'fear', 'doubt', 'laziness', 'tooold', 'unworthiness'] as const;
const ATTRIB = ['tiktok', 'instagram', 'friend', 'appstore', 'search', 'other'] as const;
const REMINDERS = ['morning', 'afternoon', 'evening'] as const;
const COUNTS = [3, 5, 7] as const;
const PRESENTATIONS: HeroPresentation[] = ['female', 'male', 'neutral'];

/** Cal AI-style personalized onboarding: questionnaire → seeded plan → priming paywall. */
export function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation('onboarding');
  const reduced = useReducedMotion();
  const applyStarterPlan = useApplyStarterPlan();

  const [index, setIndex] = useState(0);
  const step: Step = STEPS[index]!;

  // Answers
  const [attribution, setAttribution] = useState<string | undefined>();
  const [focus, setFocus] = useState<string[]>([]);
  const [blocker, setBlocker] = useState<string | undefined>();
  const [count, setCount] = useState<number>(5);
  const [reminderTime, setReminderTime] = useState<string | undefined>();
  const [why, setWhy] = useState('');
  const [presentation, setPresentation] = useState<HeroPresentation>('neutral');
  const [heroName, setHeroName] = useState('');
  const [plan, setPlan] = useState<StarterPlan | null>(null);
  const applied = useRef(false);

  const anim = useRef(new Animated.Value(1)).current;
  const go = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= STEPS.length) return;
    if (reduced) {
      setIndex(nextIndex);
      return;
    }
    Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setIndex(nextIndex);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: durations.slow, useNativeDriver: true }).start();
    });
  };
  const next = () => go(index + 1);
  const back = () => go(index - 1);
  const finish = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  // Apply the plan when we reach the "building" beat, then reveal it.
  useEffect(() => {
    if (step !== 'building' || applied.current) return;
    applied.current = true;
    void (async () => {
      const result = await applyStarterPlan({
        answers: { focus, blocker, habitCount: count, reminderTime, why },
        presentation,
        name: heroName,
        attributionSource: attribution,
      });
      setPlan(result);
      setTimeout(() => go(index + 1), reduced ? 0 : 1100);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggleFocus = (key: string) =>
    setFocus((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const animStyle = { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] };

  return (
    <ScreenContainer backgroundColor={colors.background}>
      {/* Progress */}
      {step !== 'building' && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((index + 1) / STEPS.length) * 100}%` }]} />
        </View>
      )}

      <Animated.View style={[styles.flex, animStyle]}>
        {step === 'hook' && <Hook t={t} onNext={next} />}

        {step === 'attribution' && (
          <Picker t={t} title={t('funnel.attribution.title')} subtitle={t('funnel.attribution.subtitle')} onBack={back}
            onNext={next} canNext={!!attribution}>
            {ATTRIB.map((a) => (
              <Chip key={a} label={t(`funnel.attribution.${a}`)} on={attribution === a} onPress={() => setAttribution(a)} />
            ))}
          </Picker>
        )}

        {step === 'focus' && (
          <Picker t={t} title={t('funnel.focus.title')} subtitle={t('funnel.focus.subtitle')} onBack={back}
            onNext={next} canNext={focus.length > 0}>
            {GOAL_TEMPLATES.map((g) => (
              <Chip key={g.key} label={`${g.emoji} ${t(`goalTemplates:${g.key}`)}`} on={focus.includes(g.key)} onPress={() => toggleFocus(g.key)} />
            ))}
          </Picker>
        )}

        {step === 'blocker' && (
          <Picker t={t} title={t('funnel.blocker.title')} subtitle={t('funnel.blocker.subtitle')} onBack={back}
            onNext={next} canNext={!!blocker}>
            {BLOCKERS.map((b) => (
              <Chip key={b} label={t(`funnel.blocker.${b}`)} on={blocker === b} onPress={() => setBlocker(b)} />
            ))}
          </Picker>
        )}

        {step === 'count' && (
          <Picker t={t} title={t('funnel.count.title')} subtitle={t('funnel.count.subtitle')} onBack={back} onNext={next} canNext>
            {COUNTS.map((c) => (
              <Chip key={c} label={t('funnel.count.perDay', { count: c })} on={count === c} onPress={() => setCount(c)} />
            ))}
          </Picker>
        )}

        {step === 'reminder' && (
          <Picker t={t} title={t('funnel.reminder.title')} subtitle={t('funnel.reminder.subtitle')} onBack={back} onNext={next} canNext>
            {REMINDERS.map((r) => (
              <Chip key={r} label={t(`funnel.reminder.${r}`)} on={reminderTime === r} onPress={() => setReminderTime(r)} />
            ))}
          </Picker>
        )}

        {step === 'why' && (
          <Scaffold t={t} title={t('funnel.why.title')} subtitle={t('funnel.why.subtitle')} onBack={back} onNext={next} canNext>
            <TextInput
              value={why}
              onChangeText={setWhy}
              placeholder={t('funnel.why.placeholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={80}
              multiline
            />
          </Scaffold>
        )}

        {step === 'choose' && (
          <Scaffold t={t} title={t('choose.title')} subtitle={t('choose.subtitle')} onBack={back} onNext={next} canNext>
            <Text style={styles.fieldLabel}>{t('choose.nameLabel')}</Text>
            <TextInput
              value={heroName}
              onChangeText={setHeroName}
              placeholder={t('choose.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              maxLength={40}
            />
            <View style={styles.chipWrap}>
              {PRESENTATIONS.map((p) => (
                <Chip key={p} label={t(`choose.${p}`)} on={presentation === p} onPress={() => setPresentation(p)} />
              ))}
            </View>
          </Scaffold>
        )}

        {step === 'commit' && (
          <CenterCard t={t} kicker={undefined} title={t('funnel.commit.title')} body={t('funnel.commit.subtitle')}
            cta={t('funnel.commit.cta')} onCta={next} onBack={back} />
        )}

        {step === 'rating' && (
          <CenterCard t={t} title={t('funnel.rating.title')} body={t('funnel.rating.subtitle')}
            cta={t('funnel.rating.cta')} onCta={async () => { await requestAppReview(); next(); }}
            later={t('funnel.rating.later')} onLater={next} onBack={back} />
        )}

        {step === 'notify' && (
          <CenterCard t={t} title={t('funnel.notify.title')} body={t('funnel.notify.subtitle')}
            cta={t('funnel.notify.cta')} onCta={async () => { await requestNotificationPermission(); next(); }}
            later={t('funnel.notify.later')} onLater={next} onBack={back} />
        )}

        {step === 'building' && <Building t={t} />}

        {step === 'reveal' && plan && (
          <Reveal t={t} plan={plan} name={heroName.trim()} onNext={next} />
        )}

        {step === 'primeTrial' && (
          <CenterCard t={t} title={t('funnel.prime.trialTitle')} body={t('funnel.prime.trialBody')}
            cta={t('funnel.prime.trialCta')} onCta={next} later={t('funnel.prime.later')} onLater={finish} hero />
        )}

        {step === 'primeRemind' && (
          <CenterCard t={t} title={t('funnel.prime.remindTitle')} body={t('funnel.prime.remindBody')}
            cta={t('funnel.prime.remindCta')} onCta={next} later={t('funnel.prime.later')} onLater={finish} />
        )}

        {step === 'plans' && (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{t('funnel.prime.plansTitle')}</Text>
            <Text style={styles.subtitle}>{t('funnel.prime.plansBody')}</Text>
            <PlusPlans onPurchased={finish} />
            <Pressable onPress={finish} accessibilityRole="button" style={styles.later}>
              <Text style={styles.laterText}>{t('funnel.prime.later')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </Animated.View>
    </ScreenContainer>
  );
}

// --- step pieces ------------------------------------------------------------

type TF = ReturnType<typeof useTranslation>['t'];

function Hook({ t, onNext }: { t: TF; onNext: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.heroStage}>
        <View style={styles.heroHalo} />
        <AnimatedHero presentation="neutral" tier="luminary" size={132} />
      </View>
      <Text style={styles.badge}>{t('launch.badge')}</Text>
      <Text style={styles.title}>{t('launch.title')}</Text>
      <Text style={styles.subtitle}>{t('launch.body')}</Text>
      <PrimaryButton label={t('continue')} variant="action" onPress={onNext} style={styles.cta} />
    </View>
  );
}

function Scaffold({ t, title, subtitle, children, onBack, onNext, canNext }: {
  t: TF; title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void; onNext: () => void; canNext: boolean;
}) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
      <View style={styles.footer}>
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backText}>{t('back')}</Text>
          </Pressable>
        )}
        <PrimaryButton label={t('continue')} variant="action" onPress={onNext} disabled={!canNext} style={styles.footerCta} />
      </View>
    </View>
  );
}

function Picker(props: { t: TF; title: string; subtitle?: string; children: React.ReactNode; onBack?: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <Scaffold {...props}>
      <View style={styles.chipWrap}>{props.children}</View>
    </Scaffold>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </PressableScale>
  );
}

function CenterCard({ t, kicker, title, body, cta, onCta, later, onLater, onBack, hero }: {
  t: TF; kicker?: string; title: string; body: string; cta: string; onCta: () => void; later?: string; onLater?: () => void; onBack?: () => void; hero?: boolean;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.center}>
        {hero && (
          <View style={styles.heroStage}>
            <View style={styles.heroHalo} />
            <AnimatedHero presentation="neutral" tier="luminary" size={110} />
          </View>
        )}
        {kicker ? <Text style={styles.badge}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{body}</Text>
      </View>
      <View style={styles.footerCol}>
        <PrimaryButton label={cta} variant="action" onPress={onCta} />
        {later && onLater && (
          <Pressable onPress={onLater} accessibilityRole="button" style={styles.later} hitSlop={8}>
            <Text style={styles.laterText}>{later}</Text>
          </Pressable>
        )}
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" style={styles.later} hitSlop={8}>
            <Text style={styles.backText}>{t('back')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Building({ t }: { t: TF }) {
  const lines = [t('funnel.building.l1'), t('funnel.building.l2'), t('funnel.building.l3'), t('funnel.building.l4')];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), 700);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.identity} />
      <Text style={[styles.title, { marginTop: spacing.lg }]}>{t('funnel.building.title')}</Text>
      <Text style={styles.subtitle}>{lines[i]}</Text>
    </View>
  );
}

function Reveal({ t, plan, name, onNext }: { t: TF; plan: StarterPlan; name: string; onNext: () => void }) {
  return (
    <View style={styles.flex}>
      <ConfettiBurst />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{t('funnel.reveal.kicker')}</Text>
        <Text style={styles.title}>{name ? t('funnel.reveal.title', { name }) : t('funnel.reveal.title', { name: '' }).trim()}</Text>
        <Text style={styles.subtitle}>{t('funnel.reveal.subtitle')}</Text>

        <RevealGroup title={t('funnel.reveal.goalsTitle')} items={plan.goalKeys.map((k) => t(`goalTemplates:${k}`))} />
        <RevealGroup title={t('funnel.reveal.habitsTitle')} items={plan.habitIds.map((id) => t(`habits:${id}`, { defaultValue: id }))} />
        <RevealGroup title={t('funnel.reveal.projectsTitle')} items={plan.recommendedProjectIds.map((id) => t(`featured:${id}.title`, { defaultValue: id }))} />
      </ScrollView>
      <View style={styles.footerCol}>
        <PrimaryButton label={t('funnel.reveal.cta')} variant="action" onPress={onNext} />
      </View>
    </View>
  );
}

function RevealGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.revealGroup}>
      <Text style={styles.revealGroupTitle}>{title}</Text>
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={styles.revealRow}>
          <Text style={styles.revealDot}>✦</Text>
          <Text style={styles.revealItem}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.identity },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  scroll: { gap: spacing.sm, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  body: { marginTop: spacing.md },

  heroStage: { width: 160, height: 160, borderRadius: radii.xl, backgroundColor: colors.violetDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: spacing.sm },
  heroHalo: { position: 'absolute', width: 124, height: 124, borderRadius: radii.round, backgroundColor: colors.identity, opacity: 0.5 },

  badge: { ...typography.label, letterSpacing: 2, color: colors.violetDeep },
  kicker: { ...typography.label, letterSpacing: 2, color: colors.violetDeep },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.border },
  chipOn: { backgroundColor: colors.violetSoft, borderColor: colors.identity },
  chipText: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  chipTextOn: { color: colors.violetDeep },

  fieldLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  footerCol: { gap: spacing.sm, paddingVertical: spacing.md },
  footerCta: { flex: 1 },
  backBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
  cta: { alignSelf: 'stretch', marginTop: spacing.md },
  later: { alignItems: 'center', paddingVertical: spacing.sm },
  laterText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },

  revealGroup: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  revealGroupTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.xs },
  revealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  revealDot: { ...typography.label, color: colors.identity },
  revealItem: { ...typography.body, color: colors.textPrimary, flex: 1 },
});
