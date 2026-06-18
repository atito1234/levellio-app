import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HeroAvatar } from '@/components/HeroAvatar';
import { FollowButton } from '@/components/FollowButton';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { getBucketColor } from '@/lib/buckets';
import {
  REACTIONS,
  myReaction,
  reactionTotal,
  timeAgo,
  topReactions,
  type Post,
  type ReactionEmoji,
} from '@/lib/community';

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
  const { uid, setReaction } = useCommunity();
  const mine = uid ? myReaction(post.reactions, uid) : null;
  const total = reactionTotal(post.reactions);
  const tops = topReactions(post.reactions);
  const projectColor = post.projectColorId ? getBucketColor(post.projectColorId).accent : VIOLET;

  const react = (emoji: ReactionEmoji) => {
    // Tapping your current reaction clears it; otherwise set the new one.
    void setReaction(post.id, mine === emoji ? null : emoji);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <HeroAvatar presentation={post.presentation ?? 'neutral'} tier="novice" size={40} />
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={1}>{post.displayName}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {timeAgo(post.createdAt)}
            {post.projectTitle ? ` · ${post.projectTitle}` : ''}
          </Text>
        </View>
        {post.authorUid !== uid && <FollowButton targetUid={post.authorUid} />}
      </View>

      {post.kind === 'contribution' && post.habitTitle ? (
        <View style={[styles.contribBanner, { backgroundColor: getBucketColor(post.projectColorId ?? 'violet').soft }]}>
          <Text style={[styles.contribText, { color: projectColor }]}>
            ✅ {post.habitTitle} · +{post.value ?? 1}
            {post.mode === 'onsite' ? ' · 📍 on-site' : ''}
          </Text>
        </View>
      ) : null}

      {post.text.length > 0 && (
        <Pressable onPress={() => onOpen(post.id)} accessibilityRole="button" accessibilityLabel={`Open post by ${post.displayName}`}>
          <Text style={styles.body}>{post.text}</Text>
        </Pressable>
      )}

      {(total > 0 || post.commentCount > 0) && (
        <View style={styles.tally}>
          <Text style={styles.tallyText}>{total > 0 ? `${tops.join('')} ${total}` : ''}</Text>
          {post.commentCount > 0 && (
            <Pressable onPress={() => onOpen(post.id)} accessibilityRole="button">
              <Text style={styles.tallyText}>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.reactBar}>
          {REACTIONS.map((emoji) => {
            const on = mine === emoji;
            return (
              <Pressable
                key={emoji}
                onPress={() => react(emoji)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`React ${emoji}`}
                style={[styles.reactBtn, on && styles.reactBtnOn]}
                hitSlop={6}
              >
                <Text style={styles.reactEmoji}>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => onOpen(post.id)} accessibilityRole="button" accessibilityLabel="Comment" style={styles.commentBtn}>
          <Text style={styles.commentText}>💬 Comment</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm, shadowColor: '#1B1B2A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  name: { ...typography.label, color: INK, fontWeight: '800' },
  meta: { ...typography.caption, color: MUTED },
  contribBanner: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contribText: { ...typography.caption, fontWeight: '800' },
  body: { ...typography.body, color: INK },
  tally: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  tallyText: { ...typography.caption, color: MUTED },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: TRACK, paddingTop: spacing.sm },
  reactBar: { flexDirection: 'row', gap: 4 },
  reactBtn: { width: 40, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  reactBtnOn: { backgroundColor: '#EDE9FE' },
  reactEmoji: { fontSize: 18 },
  commentBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  commentText: { ...typography.label, color: MUTED, fontWeight: '700' },
});
