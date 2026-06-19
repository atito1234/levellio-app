import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FollowButton,
  HeroAvatar,
  PostCard,
  PrimaryButton,
  ProjectBadge,
  ScreenContainer,
  StatPill,
  TextField,
  XPBar,
} from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useProfile, useMyUid } from '@/state/ProfileContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { useCommunity } from '@/state/CommunityContext';
import { useSettings } from '@/state/SettingsContext';
import { timeAgo, type Post } from '@/lib/community';
import type { HeroTier } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ route, navigation }: Props) {
  const { uid } = route.params;
  const { t } = useTranslation(['profile', 'common', 'messaging']);
  const myUid = useMyUid();
  const isMe = myUid === uid;
  const { profile, loading } = useProfile(uid);
  const { character } = useGame();
  const { myProjects } = useProjects();
  const { subscribeFeed } = useCommunity();

  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    const unsub = subscribeFeed('all', (all) => setPosts(all.filter((p) => p.authorUid === uid)));
    return unsub;
  }, [uid, subscribeFeed]);

  const tierLabel = (tier: HeroTier) => t(`profile:tier.${tier}`);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.identity} />
          <Text style={styles.muted}>{t('profile:loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.muted}>{t('profile:notFound')}</Text>
          <PrimaryButton label={t('common:action.back')} variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Cover + avatar header (LinkedIn-style). */}
        <View style={styles.cover} />
        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            <HeroAvatar presentation={profile.presentation ?? 'neutral'} tier={profile.tier} size={88} />
          </View>
          <View style={styles.headerRight}>
            {isMe ? (
              <EditProfileButton />
            ) : (
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => navigation.navigate('Chat', { uid, displayName: profile.displayName, presentation: profile.presentation })}
                  accessibilityRole="button"
                  accessibilityLabel={t('messaging:message')}
                  style={styles.messageBtn}
                >
                  <Text style={styles.messageBtnText}>{t('messaging:message')}</Text>
                </Pressable>
                <FollowButton targetUid={uid} size="md" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile.displayName}</Text>
          <View style={styles.tierRow}>
            <View style={styles.tierChip}>
              <Text style={styles.tierChipText}>{tierLabel(profile.tier)}</Text>
            </View>
            {profile.country ? <Text style={styles.country}>📍 {profile.country}</Text> : null}
          </View>
          {profile.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}
        </View>

        {/* Stat row. */}
        <View style={styles.statRow}>
          <StatPill icon="⭐" value={`${profile.level}`} label={t('profile:stats.level')} tint={colors.identity} />
          <StatPill icon="🔥" value={`${profile.streakDays}`} label={t('profile:stats.streak')} tint={colors.reward} />
          <StatPill icon="✨" value={`${profile.lifetimeXp}`} label={t('profile:stats.xp')} tint={colors.gold} />
          <StatPill icon="🤝" value={`${profile.projectsJoined}`} label={t('profile:stats.projects')} tint={colors.action} />
        </View>

        {/* Own XP bar (we have live xp only for the viewer). */}
        {isMe && character ? (
          <View style={styles.card}>
            <XPBar character={character} />
          </View>
        ) : null}

        {/* Recent milestones. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile:sections.milestones')}</Text>
          {profile.recentMilestones.length === 0 ? (
            <Text style={styles.muted}>{t('profile:empty.milestones')}</Text>
          ) : (
            profile.recentMilestones.map((m, i) => (
              <View key={`${m.label}-${i}`} style={styles.mRow}>
                <Text style={styles.mEmoji}>{m.emoji}</Text>
                <Text style={styles.mLabel} numberOfLines={1}>{m.label}</Text>
                <Text style={styles.mTime}>{timeAgo(m.earnedAt)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Projects (own profile shows the joined list). */}
        {isMe && myProjects.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile:sections.projects')}</Text>
            <ProjectBadge projects={myProjects} />
          </View>
        ) : null}

        {/* Recent posts. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile:sections.posts')}</Text>
          {posts.length === 0 ? (
            <Text style={styles.muted}>{t('profile:empty.posts')}</Text>
          ) : (
            <View style={styles.posts}>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onOpen={(postId) => navigation.navigate('PostDetail', { postId })} />
              ))}
            </View>
          )}
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

/** Inline edit of the public headline + location for your own profile. */
function EditProfileButton() {
  const { t } = useTranslation(['profile', 'common']);
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [headline, setHeadline] = useState(settings.profileHeadline ?? '');
  const [country, setCountry] = useState(settings.profileCountry ?? '');

  const save = async () => {
    await update({ profileHeadline: headline.trim(), profileCountry: country.trim() });
    setOpen(false);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('profile:edit')} style={styles.editBtn}>
        <Text style={styles.editBtnText}>{t('profile:edit')}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>{t('profile:edit')}</Text>
            <TextField
              label={t('profile:editHeadline')}
              value={headline}
              onChangeText={setHeadline}
              placeholder={t('profile:headlinePlaceholder')}
              maxLength={80}
            />
            <TextField
              label={t('profile:editCountry')}
              value={country}
              onChangeText={setCountry}
              placeholder={t('profile:countryPlaceholder')}
              maxLength={60}
            />
            <PrimaryButton label={t('common:action.save')} variant="action" onPress={() => void save()} />
            <PrimaryButton label={t('common:action.cancel')} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const COVER_H = 96;
const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  muted: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  cover: { height: COVER_H, backgroundColor: colors.identity },
  headerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -COVER_H / 2,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -52,
  },
  headerRight: { position: 'absolute', right: spacing.lg, top: spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  messageBtn: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: colors.identity },
  messageBtnText: { ...typography.caption, color: colors.identity, fontWeight: '800' },
  name: { ...typography.heading, color: colors.textPrimary },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierChip: { backgroundColor: colors.violetSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  tierChipText: { ...typography.caption, color: colors.violetDeep, fontWeight: '800' },
  country: { ...typography.caption, color: colors.textSecondary },
  headline: { ...typography.body, color: colors.textSecondary },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardTitle: { ...typography.title, color: colors.textPrimary },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mEmoji: { fontSize: 20 },
  mLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  mTime: { ...typography.caption, color: colors.textMuted },
  posts: { gap: spacing.md },
  editBtn: { backgroundColor: colors.violetSoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  editBtnText: { ...typography.label, color: colors.violetDeep, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
});
