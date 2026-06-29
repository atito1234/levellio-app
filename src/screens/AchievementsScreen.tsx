/**
 * Achievements — a badge gallery (X of Y unlocked, grouped) where each unlocked
 * badge opens a premium certificate backed by real analytics + a "how you did it"
 * lesson. Earned state is computed live; "seen" is persisted (AchievementsContext).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader, SectionLabel } from '@/components';
import { AchievementUnlockedModal } from '@/components/AchievementUnlockedModal';
import { radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useAuth } from '@/state/AuthContext';
import { useAchievements } from '@/state/AchievementsContext';
import { useAchievementStats } from '@/state/useAchievementStats';
import { evaluateAchievements, groupStates, unlockedCount, type AchievementState } from '@/lib/achievements';
import { ACHIEVEMENTS } from '@/data/achievements';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

export function AchievementsScreen({ navigation }: Props) {
  const { t } = useTranslation('achievements');
  const { character } = useGame();
  const { account } = useAuth();
  const { markSeen } = useAchievements();
  const ctx = useAchievementStats();

  const states = useMemo(() => evaluateAchievements(ACHIEVEMENTS, ctx.stats), [ctx.stats]);
  const groups = useMemo(() => groupStates(states), [states]);
  const unlocked = unlockedCount(states);
  const total = states.length;
  const pct = total ? Math.round((unlocked / total) * 100) : 0;
  const name = account?.displayName?.trim() || character?.name?.trim() || t('cert.you');

  const [selected, setSelected] = useState<AchievementState | null>(null);

  // Acknowledge everything currently earned (for future "new!" highlighting).
  useEffect(() => {
    const earnedIds = states.filter((s) => s.earned).map((s) => s.def.id);
    if (earnedIds.length) markSeen(earnedIds);
  }, [states, markSeen]);

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader title={t('title')} onBack={() => navigation.goBack()} backLabel={t('back')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Progress header. */}
        <View style={styles.headerCard}>
          <Text style={styles.trophy}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('progress', { unlocked, total })}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(3, pct)}%` }]} />
            </View>
          </View>
          <Text style={styles.pct}>{pct}%</Text>
        </View>

        {groups.map((g) => (
          <View key={g.group} style={styles.group}>
            <SectionLabel>{t('group.' + g.group)}</SectionLabel>
            <View style={styles.grid}>
              {g.items.map((s) => (
                <BadgeCard key={s.def.id} state={s} t={t} onPress={() => s.earned && setSelected(s)} />
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <AchievementUnlockedModal state={selected} ctx={ctx} name={name} onClose={() => setSelected(null)} />
    </ScreenContainer>
  );
}

function BadgeCard({ state, t, onPress }: { state: AchievementState; t: ReturnType<typeof useTranslation>['t']; onPress: () => void }) {
  const earned = state.earned;
  return (
    <Pressable
      onPress={onPress}
      disabled={!earned}
      accessibilityRole="button"
      accessibilityState={{ disabled: !earned }}
      accessibilityLabel={`${t('items.' + state.def.id + '.title')} — ${earned ? t('unlocked') : t('locked')}`}
      style={[styles.badge, !earned && styles.badgeLocked]}
    >
      <View style={[styles.badgeIconWrap, earned && styles.badgeIconWrapOn]}>
        <Text style={styles.badgeIcon}>{earned ? state.def.emoji : '🔒'}</Text>
      </View>
      <Text style={styles.badgeTitle} numberOfLines={2}>{t('items.' + state.def.id + '.title')}</Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>{t('items.' + state.def.id + '.desc')}</Text>
      {earned ? (
        <Text style={styles.badgeUnlocked}>{t('unlocked')}</Text>
      ) : state.progressPct > 0 ? (
        <View style={styles.miniTrack}>
          <View style={[styles.miniFill, { width: `${Math.max(4, state.progressPct)}%` }]} />
        </View>
      ) : (
        <Text style={styles.badgeLockedText}>{t('locked')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, ...shadows.md },
  trophy: { fontSize: 32 },
  headerTitle: { ...typography.title, color: INK, fontWeight: '800' },
  track: { height: 8, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden', marginTop: 6 },
  fill: { height: 8, borderRadius: 999, backgroundColor: VIOLET },
  pct: { ...typography.title, color: VIOLET, fontWeight: '900' },

  group: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { width: '48%', backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, gap: 4, alignItems: 'center', ...shadows.sm },
  badgeLocked: { backgroundColor: '#FAFAF8', opacity: 0.9 },
  badgeIconWrap: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF1F8' },
  badgeIconWrapOn: { backgroundColor: '#EAF6F2' },
  badgeIcon: { fontSize: 28 },
  badgeTitle: { ...typography.label, color: INK, fontWeight: '800', textAlign: 'center', minHeight: 34 },
  badgeDesc: { ...typography.caption, color: MUTED, textAlign: 'center', minHeight: 30 },
  badgeUnlocked: { ...typography.caption, color: TEAL, fontWeight: '800' },
  badgeLockedText: { ...typography.caption, color: MUTED },
  miniTrack: { alignSelf: 'stretch', height: 5, borderRadius: 999, backgroundColor: TRACK, overflow: 'hidden', marginTop: 2 },
  miniFill: { height: 5, borderRadius: 999, backgroundColor: VIOLET },
});
