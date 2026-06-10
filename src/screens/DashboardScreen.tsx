import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  HeroAvatar,
  PrimaryButton,
  QuestCard,
  ScreenContainer,
  StatPill,
  XPBar,
} from '@/components';
import { colors, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { lifetimeXp } from '@/lib/leveling';
import { defaultAIEngine } from '@/services/ai';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Day-5 dashboard: hero summary, XP bar, streak, and today's quests. */
export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { character, quests, completeQuest, suggestQuest, status } = useGame();
  const [motivation, setMotivation] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!character) return;
    let active = true;
    defaultAIEngine
      .motivate({ streakDays: character.streakDays, level: character.level })
      .then((line) => {
        if (active) setMotivation(line);
      });
    return () => {
      active = false;
    };
  }, [character]);

  const remaining = useMemo(() => quests.filter((q) => !q.completed).length, [quests]);

  if (status === 'loading' || !character) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.identity} />
        </View>
      </ScreenContainer>
    );
  }

  const handleComplete = async (questId: string) => {
    const reward = await completeQuest(questId);
    if (reward) navigation.navigate('QuestComplete', { reward });
  };

  const handleSuggest = async () => {
    try {
      setSuggesting(true);
      await suggestQuest('Build a better day');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero summary card */}
        <View style={styles.heroCard}>
          <HeroAvatar presentation={character.presentation} tier={character.tier} size={72} />
          <View style={styles.heroInfo}>
            <Text style={styles.greeting}>Welcome back, hero</Text>
            {motivation ? <Text style={styles.motivation}>{motivation}</Text> : null}
          </View>
        </View>

        <XPBar character={character} />

        <View style={styles.stats}>
          <StatPill icon="🔥" value={`${character.streakDays}d`} label="Streak" tint={colors.gold} />
          <StatPill
            icon="✨"
            value={`${lifetimeXp(character)}`}
            label="Total XP"
            tint={colors.identity}
          />
        </View>

        <View style={styles.questsHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Quests</Text>
          <Text style={styles.remaining}>{remaining} left</Text>
        </View>

        <View style={styles.questList}>
          {quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              streakDays={character.streakDays}
              onComplete={handleComplete}
            />
          ))}
        </View>

        {remaining === 0 && (
          <Text style={styles.allDone}>All quests complete — see you tomorrow! 🎉</Text>
        )}

        <PrimaryButton
          label="✨ Suggest a quest"
          variant="ghost"
          onPress={handleSuggest}
          loading={suggesting}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  greeting: {
    ...typography.title,
    color: colors.textPrimary,
  },
  motivation: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  questsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  remaining: {
    ...typography.label,
    color: colors.textMuted,
  },
  questList: {
    gap: spacing.md,
  },
  allDone: {
    ...typography.body,
    color: colors.tealDeep,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
