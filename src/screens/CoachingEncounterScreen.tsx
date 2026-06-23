import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, DragonSprite } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useJournal } from '@/state/JournalContext';
import { useSettings } from '@/state/SettingsContext';
import { buildCoaching, type CoachingContext } from '@/lib/coaching';
import { getFramework } from '@/data/coaching/frameworks';
import { getDragon } from '@/data/dragons';
import { buildEngine, generateCoaching } from '@/services/ai';
import { getByoApiKey } from '@/services/security/secureKeyStore';
import { canUse } from '@/services/monetization/entitlements';
import { useEntitlements } from '@/state/SubscriptionContext';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachingEncounter'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const shadow = {
  shadowColor: '#1B1B2A',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 3,
} as const;

export function CoachingEncounterScreen({ route, navigation }: Props) {
  const { t } = useTranslation('coaching');
  const { dragonId = 'procrastination', dragonName, questId, minutesAvailable, blockerId } = route.params ?? {};
  const { quests } = useGame();
  const { goals } = useGoals();
  const { entriesForDragon } = useJournal();
  const { settings } = useSettings();
  const entitlements = useEntitlements();

  const dragon = getDragon(dragonId, dragonName);
  const dragonDisplayName = t('dragons:' + dragon.id + '.name', { defaultValue: dragon.name });
  const quest = questId ? quests.find((q) => q.id === questId) : undefined;
  const recentMood = entriesForDragon(dragonId)[0]?.mood;

  const coachCtx = useMemo<CoachingContext>(
    () => ({
      dragonId,
      ...(blockerId ? { blockerId } : {}),
      ...(quest ? { quest } : {}),
      goals,
      ...(recentMood ? { recentMood } : {}),
      ...(minutesAvailable != null ? { minutesAvailable } : {}),
    }),
    [dragonId, blockerId, quest, goals, recentMood, minutesAvailable],
  );

  // Curated by default + offline. When the user is entitled to AI (premium +
  // cloud), enrich it; it always falls back to curated, so the UI never waits.
  const curated = useMemo(() => buildCoaching(coachCtx), [coachCtx]);
  const [plan, setPlan] = useState(curated);
  // AI Coach is a Plus perk: enrich the curated coaching with the user's cloud AI.
  const entitled = canUse('ai-coach', entitlements) && settings.aiMode === 'cloud';

  useEffect(() => {
    setPlan(curated);
    if (!entitled) return;
    let active = true;
    const engine = buildEngine(settings, { getApiKey: () => getByoApiKey() });
    generateCoaching(engine, coachCtx, entitled).then((r) => {
      if (active) setPlan(r.plan);
    });
    return () => {
      active = false;
    };
  }, [curated, coachCtx, entitled, settings]);

  // Question-at-a-time flow, then reveal the tactic.
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tIndex, setTIndex] = useState(0);

  const total = plan.questions.length;
  const question = plan.questions[Math.min(qIndex, total - 1)];
  const allTactics = [plan.tactic, ...plan.alternatives];
  const tactic = allTactics[tIndex % allTactics.length]!;
  const evidence = getFramework(tactic.frameworkId);

  // Localized content (curated/AI data stays English; we localize at the render
  // site keyed by stable ids, with the English value as the guaranteed fallback).
  const blockerLabel = t('coachingContent:blocker.' + plan.blocker.id + '.label', { defaultValue: plan.blocker.label });
  const blockerTell = t('coachingContent:blocker.' + plan.blocker.id + '.tell', { defaultValue: plan.blocker.tell });
  const questionText = question
    ? t('coachingContent:question.' + question.id + '.text', { defaultValue: question.text })
    : '';
  const questionFollowUp = question?.followUp
    ? t('coachingContent:question.' + question.id + '.followUp', { defaultValue: question.followUp })
    : undefined;
  const tacticName = t('coachingContent:tactic.' + tactic.id + '.name', { defaultValue: tactic.name });
  const tacticHow = t('coachingContent:tactic.' + tactic.id + '.how', { defaultValue: tactic.how });
  const evidencePrinciple = t('coachingContent:framework.' + evidence.id + '.principle', { defaultValue: evidence.principle });
  const evidenceSource = t('coachingContent:framework.' + evidence.id + '.source', { defaultValue: evidence.source });

  const journalThis = () =>
    navigation.navigate('JournalComposer', {
      dragonId,
      dragonName: dragonDisplayName,
      ...(questId ? { questIds: [questId] } : {}),
      ...(plan.context ? { prompt: plan.context.prompt } : {}),
      teaching: `${t('journalTeaching', { name: tacticName, how: tacticHow })}${plan.context ? `\n\n${plan.context.teaching}` : ''}`,
    });

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('close')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('title')}
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Who you're facing + the pattern named in plain language. */}
        <View style={[styles.dragonHead, shadow]}>
          <DragonSprite colorId={dragon.colorId} size={76} />
          <View style={styles.dragonHeadText}>
            <Text style={styles.dragonName} numberOfLines={1}>
              {dragonDisplayName}
            </Text>
            <Text style={styles.blockerLabel}>{t('thisSoundsLike', { label: blockerLabel })}</Text>
            <Text style={styles.blockerTell}>“{blockerTell}”</Text>
          </View>
        </View>

        {!revealed ? (
          <View style={[styles.qCard, shadow]}>
            <Text style={styles.qKicker}>{t('thinkItThrough', { current: qIndex + 1, total })}</Text>
            <Text style={styles.qText}>{questionText}</Text>
            {questionFollowUp && <Text style={styles.qFollow}>{questionFollowUp}</Text>}
            <View style={styles.dots}>
              {plan.questions.map((q, i) => (
                <View key={q.id} style={[styles.dot, i === qIndex && styles.dotOn]} />
              ))}
            </View>
            <Pressable
              onPress={() => (qIndex < total - 1 ? setQIndex((i) => i + 1) : setRevealed(true))}
              accessibilityRole="button"
              accessibilityLabel={qIndex < total - 1 ? t('nextQuestionA11y') : t('seeTacticA11y')}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>{qIndex < total - 1 ? t('next') : t('seeATactic')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.tacticCard, shadow]}>
            <Text style={styles.qKicker}>{t('tryThis')}</Text>
            <Text style={styles.tacticName}>{tacticName}</Text>
            <Text style={styles.tacticHow}>{tacticHow}</Text>
            <Text style={styles.evidence}>{t('evidence', { principle: evidencePrinciple, source: evidenceSource })}</Text>
            {allTactics.length > 1 && (
              <Pressable onPress={() => setTIndex((i) => i + 1)} accessibilityRole="button" accessibilityLabel={t('differentTacticA11y')} hitSlop={8}>
                <Text style={styles.altLink}>{t('differentTactic')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('readyA11y')} style={styles.cta}>
          <Text style={styles.ctaText}>{t('ready')}</Text>
        </Pressable>
        <Pressable onPress={journalThis} accessibilityRole="button" accessibilityLabel={t('journalThisA11y')} style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('journalThis')}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  chevronSpacer: { width: 28 },
  title: { ...typography.title, color: INK, fontWeight: '800' },
  content: { gap: spacing.md, paddingBottom: spacing.xl },

  dragonHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 20, padding: spacing.md, borderWidth: 1, borderColor: '#E2DBFB' },
  dragonHeadText: { flex: 1, gap: 2 },
  dragonName: { ...typography.title, color: INK, fontWeight: '800' },
  blockerLabel: { ...typography.label, color: VIOLET, fontWeight: '700' },
  blockerTell: { ...typography.body, color: MUTED, fontStyle: 'italic' },

  qCard: { backgroundColor: CARD, borderRadius: 20, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: TRACK },
  qKicker: { ...typography.label, color: MUTED, letterSpacing: 2 },
  qText: { ...typography.heading, color: INK, fontWeight: '800' },
  qFollow: { ...typography.body, color: MUTED },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TRACK },
  dotOn: { backgroundColor: VIOLET, width: 20 },
  nextBtn: { alignSelf: 'flex-start', backgroundColor: VIOLET_SOFT, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  nextText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  tacticCard: { backgroundColor: CARD, borderRadius: 20, padding: spacing.lg, gap: spacing.sm, borderWidth: 2, borderColor: TEAL },
  tacticName: { ...typography.title, color: INK, fontWeight: '800' },
  tacticHow: { ...typography.body, color: INK },
  evidence: { ...typography.caption, color: MUTED },
  altLink: { ...typography.label, color: VIOLET, fontWeight: '700', marginTop: spacing.xs },

  actions: { gap: spacing.sm, paddingTop: spacing.sm },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  secondary: { borderRadius: 999, paddingVertical: spacing.sm, alignItems: 'center' },
  secondaryText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
