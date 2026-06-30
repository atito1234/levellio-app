import React, { useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeroAvatar } from '@/components/HeroAvatar';
import { FollowButton } from '@/components/FollowButton';
import { PressableScale } from '@/components/PressableScale';
import { ReactionBurst } from '@/components/ReactionBurst';
import { AnimatedCount } from '@/components/AnimatedCount';
import { PlusBadge } from '@/components/PlusBadge';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useNotifications } from '@/state/NotificationsContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { useSettings } from '@/state/SettingsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/services/feedback/haptics';
import type { RootStackParamList } from '@/navigation/types';
import { getBucketColor } from '@/lib/buckets';
import { CATEGORY_COLOR, CATEGORY_META } from '@/lib/categories';
import {
  REACTIONS,
  myReaction,
  reactionTotal,
  topReactions,
  type Post,
  type ReactionEmoji,
} from '@/lib/community';
import { relTime } from '@/lib/relTime';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

/**
 * A feed post — avatar + author + project context + body, a one-tap reaction bar
 * (optimistic), and a comment affordance. Tapping the body opens the thread.
 * Mirrors the familiar Facebook/LinkedIn card so it's instantly intuitive.
 */
export function PostCard({ post, onOpen }: { post: Post; onOpen: (postId: string) => void }) {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { uid, setReaction, blockUser, muteUser, requestReport } = useCommunity();
  const { notifyReaction } = useNotifications();
  const { isFounding } = useSubscription();
  const { settings } = useSettings();
  const reduced = useReducedMotion();
  const openProfile = () => navigation.navigate('Profile', { uid: post.authorUid });

  // Safety: report this post / the author, mute, or block. Surfaced on others' posts.
  const openModeration = () => {
    Alert.alert(t('feed:post.moreA11y'), undefined, [
      { text: t('feed:report.reportPost'), onPress: () => requestReport({ type: 'post', id: post.id, targetUid: post.authorUid, preview: post.text }) },
      { text: t('feed:report.reportUser', { name: post.displayName }), onPress: () => requestReport({ type: 'user', id: post.authorUid, targetUid: post.authorUid, preview: post.displayName }) },
      { text: t('feed:report.mute', { name: post.displayName }), onPress: () => void muteUser(post.authorUid) },
      { text: t('feed:post.block', { name: post.displayName }), style: 'destructive', onPress: () => void blockUser(post.authorUid) },
      { text: t('common:action.cancel'), style: 'cancel' },
    ]);
  };
  const mine = uid ? myReaction(post.reactions, uid) : null;
  const total = reactionTotal(post.reactions);
  const tops = topReactions(post.reactions);
  const projectColor = post.projectColorId ? getBucketColor(post.projectColorId).accent : VIOLET;
  // Life-area colour-coding: a left accent stripe + a small tinted category tag.
  const catColor = post.category ? CATEGORY_COLOR[post.category] : null;

  const [burst, setBurst] = useState<{ emoji: string; key: number } | null>(null);
  const heart = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const react = (emoji: ReactionEmoji) => {
    // Tapping your current reaction clears it; otherwise set the new one.
    const clearing = mine === emoji;
    void setReaction(post.id, clearing ? null : emoji);
    if (!clearing) {
      notifyReaction(post, emoji);
      setBurst({ emoji, key: Date.now() });
      haptics.tap(settings.hapticsEnabled);
    }
  };

  const playHeart = () => {
    if (reduced) return;
    heart.setValue(0);
    Animated.timing(heart, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
      Animated.timing(heart, { toValue: 0, duration: 400, delay: 300, useNativeDriver: true }).start();
    });
  };

  const likeViaDoubleTap = () => {
    if (mine !== '❤️') {
      void setReaction(post.id, '❤️');
      notifyReaction(post, '❤️');
      setBurst({ emoji: '❤️', key: Date.now() });
    }
    playHeart();
    haptics.success(settings.hapticsEnabled);
  };

  // Single tap opens the thread; double tap ❤️-likes (Instagram-style).
  const onBodyTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 250) {
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = null;
      lastTap.current = 0;
      likeViaDoubleTap();
    } else {
      lastTap.current = now;
      openTimer.current = setTimeout(() => {
        openTimer.current = null;
        onOpen(post.id);
      }, 250);
    }
  };

  return (
    <View style={[styles.card, catColor ? { borderLeftWidth: 3, borderLeftColor: catColor } : null]}>
      <View style={styles.head}>
        <Pressable onPress={openProfile} accessibilityRole="button" accessibilityLabel={t('feed:post.openProfileA11y', { name: post.displayName })} style={styles.headTap}>
          <HeroAvatar presentation={post.presentation ?? 'neutral'} tier="novice" size={40} />
          <View style={styles.headText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{post.displayName}</Text>
              {isFounding && <PlusBadge label={t('common:plusBadge')} small />}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {relTime(post.createdAt, t, i18n.language)}
              {post.projectTitle ? ` · ${post.projectTitle}` : ''}
              {post.category && catColor ? (
                <Text style={{ color: catColor, fontWeight: '800' }}>{` · ${CATEGORY_META[post.category].icon} ${t('categories:' + post.category)}`}</Text>
              ) : null}
            </Text>
          </View>
        </Pressable>
        {post.authorUid !== uid && <FollowButton targetUid={post.authorUid} />}
        {post.authorUid !== uid && (
          <Pressable onPress={openModeration} accessibilityRole="button" accessibilityLabel={t('feed:post.moreA11y')} hitSlop={10} style={styles.moreBtn}>
            <Text style={styles.moreDots}>⋯</Text>
          </Pressable>
        )}
      </View>

      {post.kind === 'contribution' && post.habitTitle ? (
        <View style={[styles.contribBanner, { backgroundColor: getBucketColor(post.projectColorId ?? 'violet').soft }]}>
          <Text style={[styles.contribText, { color: projectColor }]}>
            {t('feed:post.contribution', { habit: post.habitTitle, value: post.value ?? 1 })}
            {post.mode === 'onsite' ? t('feed:post.onsiteSuffix') : ''}
          </Text>
        </View>
      ) : post.kind === 'ask' ? (
        <View style={styles.askBanner}>
          <Text style={styles.askText}>{t('feed:post.ask')}</Text>
        </View>
      ) : null}

      {post.text.length > 0 && (
        <Pressable onPress={onBodyTap} accessibilityRole="button" accessibilityLabel={t('feed:post.openA11y', { name: post.displayName })}>
          <Text style={styles.body}>{post.text}</Text>
        </Pressable>
      )}

      {(total > 0 || post.commentCount > 0) && (
        <View style={styles.tally}>
          {total > 0 ? (
            <View style={styles.tallyLeft}>
              <Text style={styles.tallyText}>{tops.join('')} </Text>
              <AnimatedCount value={total} style={styles.tallyText} />
            </View>
          ) : (
            <View />
          )}
          {post.commentCount > 0 && (
            <Pressable onPress={() => onOpen(post.id)} accessibilityRole="button">
              <Text style={styles.tallyText}>{t(post.commentCount === 1 ? 'feed:post.comments_one' : 'feed:post.comments_other', { count: post.commentCount })}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.reactBar}>
          {burst && <ReactionBurst key={burst.key} emoji={burst.emoji} />}
          {REACTIONS.map((emoji) => {
            const on = mine === emoji;
            return (
              <PressableScale
                key={emoji}
                onPress={() => react(emoji)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('feed:post.reactA11y', { emoji })}
                style={[styles.reactBtn, on && styles.reactBtnOn]}
                hitSlop={6}
              >
                <Text style={styles.reactEmoji}>{emoji}</Text>
              </PressableScale>
            );
          })}
        </View>
        <PressableScale onPress={() => onOpen(post.id)} accessibilityRole="button" accessibilityLabel={t('common:action.comment')} style={styles.commentBtn}>
          <Text style={styles.commentText}>{t('feed:post.commentBtn')}</Text>
        </PressableScale>
      </View>

      {/* Double-tap ❤️ flourish. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heart,
          { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.4] }) }] },
        ]}
      >
        <Text style={styles.heartText}>❤️</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm, shadowColor: '#1B1B2A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  moreBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  moreDots: { ...typography.title, color: MUTED, fontWeight: '800' },
  headText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.label, color: INK, fontWeight: '800', flexShrink: 1 },
  meta: { ...typography.caption, color: MUTED },
  contribBanner: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contribText: { ...typography.caption, fontWeight: '800' },
  askBanner: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#FFF3D6' },
  askText: { ...typography.caption, fontWeight: '800', color: '#8A5A0A' },
  body: { ...typography.body, color: INK },
  tally: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  tallyLeft: { flexDirection: 'row', alignItems: 'center' },
  tallyText: { ...typography.caption, color: MUTED },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: TRACK, paddingTop: spacing.sm },
  reactBar: { flexDirection: 'row', gap: 4 },
  heart: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  heartText: { fontSize: 96 },
  reactBtn: { width: 40, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  reactBtnOn: { backgroundColor: '#EDE9FE' },
  reactEmoji: { fontSize: 18 },
  commentBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  commentText: { ...typography.label, color: MUTED, fontWeight: '700' },
});
