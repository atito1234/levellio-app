import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, DragonSprite } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { useJournal } from '@/state/JournalContext';
import { buildCoaching } from '@/lib/coaching';
import { getFramework } from '@/data/coaching/frameworks';
import { getDragon } from '@/data/dragons';
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
  const { dragonId = 'procrastination', dragonName, questId, minutesAvailable, blockerId } = route.params ?? {};
  const { quests } = useGame();
  const { goals } = useGoals();
  const { entriesForDragon } = useJournal();

  const dragon = getDragon(dragonId, dragonName);
  const quest = questId ? quests.find((q) => q.id === questId) : undefined;
  const recentMood = entriesForDragon(dragonId)[0]?.mood;

  const plan = useMemo(
    () =>
      buildCoaching({
        dragonId,
        ...(blockerId ? { blockerId } : {}),
        ...(quest ? { quest } : {}),
        goals,
        ...(recentMood ? { recentMood } : {}),
        ...(minutesAvailable != null ? { minutesAvailable } : {}),
      }),
    [dragonId, blockerId, quest, goals, recentMood, minutesAvailable],
  );

  // Question-at-a-time flow, then reveal the tactic.
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tIndex, setTIndex] = useState(0);

  const total = plan.questions.length;
  const question = plan.questions[Math.min(qIndex, total - 1)];
  const allTactics = [plan.tactic, ...plan.alternatives];
  const tactic = allTactics[tIndex % allTactics.length]!;
  const evidence = getFramework(tactic.frameworkId);

  const journalThis = () =>
    navigation.navigate('JournalComposer', {
      dragonId,
      dragonName: dragon.name,
      ...(questId ? { questIds: [questId] } : {}),
      ...(plan.context ? { prompt: plan.context.prompt } : {}),
      teaching: `Try: ${tactic.name} — ${tactic.how}${plan.context ? `\n\n${plan.context.teaching}` : ''}`,
    });

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Confront your dragon
        </Text>
        <View style={styles.chevronSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Who you're facing + the pattern named in plain language. */}
        <View style={[styles.dragonHead, shadow]}>
          <DragonSprite colorId={dragon.colorId} size={76} />
          <View style={styles.dragonHeadText}>
            <Text style={styles.dragonName} numberOfLines={1}>
              {dragon.name}
            </Text>
            <Text style={styles.blockerLabel}>This sounds like: {plan.blocker.label}</Text>
            <Text style={styles.blockerTell}>“{plan.blocker.tell}”</Text>
          </View>
        </View>

        {!revealed ? (
          <View style={[styles.qCard, shadow]}>
            <Text style={styles.qKicker}>THINK IT THROUGH · {qIndex + 1}/{total}</Text>
            <Text style={styles.qText}>{question?.text}</Text>
            {question?.followUp && <Text style={styles.qFollow}>{question.followUp}</Text>}
            <View style={styles.dots}>
              {plan.questions.map((q, i) => (
                <View key={q.id} style={[styles.dot, i === qIndex && styles.dotOn]} />
              ))}
            </View>
            <Pressable
              onPress={() => (qIndex < total - 1 ? setQIndex((i) => i + 1) : setRevealed(true))}
              accessibilityRole="button"
              accessibilityLabel={qIndex < total - 1 ? 'Next question' : 'See the tactic'}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>{qIndex < total - 1 ? 'Next ›' : 'See a tactic ›'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.tacticCard, shadow]}>
            <Text style={styles.qKicker}>TRY THIS</Text>
            <Text style={styles.tacticName}>{tactic.name}</Text>
            <Text style={styles.tacticHow}>{tactic.how}</Text>
            <Text style={styles.evidence}>🧠 {evidence.principle} ({evidence.source})</Text>
            {allTactics.length > 1 && (
              <Pressable onPress={() => setTIndex((i) => i + 1)} accessibilityRole="button" accessibilityLabel="Try a different tactic" hitSlop={8}>
                <Text style={styles.altLink}>Try a different tactic ›</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="I'm ready, back to it" style={styles.cta}>
          <Text style={styles.ctaText}>⚔️ I’m ready — back to it</Text>
        </Pressable>
        <Pressable onPress={journalThis} accessibilityRole="button" accessibilityLabel="Journal this" style={styles.secondary}>
          <Text style={styles.secondaryText}>📓 Journal this</Text>
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
