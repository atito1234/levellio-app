import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeroAvatar, PostCard, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { isValidCommentText, timeAgo, type Comment, type Post } from '@/lib/community';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

/** A post + its comment thread (LinkedIn/IG-style: simple list + inline reply). */
export function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { subscribeFeed, subscribeComments, addComment } = useCommunity();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Resolve the live post from the recent feed (keeps reaction counts fresh).
  useEffect(() => {
    const unsub = subscribeFeed('all', (posts) => setPost(posts.find((p) => p.id === postId) ?? null));
    return unsub;
  }, [postId, subscribeFeed]);

  useEffect(() => {
    const unsub = subscribeComments(postId, setComments);
    return unsub;
  }, [postId, subscribeComments]);

  const send = async () => {
    if (!isValidCommentText(text) || sending) return;
    setSending(true);
    try {
      await addComment(postId, text);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Post</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {post ? <PostCard post={post} onOpen={() => undefined} /> : <Text style={styles.loading}>Loading…</Text>}

          <Text style={styles.sectionLabel}>{comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'COMMENT' : 'COMMENTS'}` : 'COMMENTS'}</Text>
          {comments.length === 0 ? (
            <Text style={styles.empty}>Be the first to comment.</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <HeroAvatar presentation={c.presentation ?? 'neutral'} tier="novice" size={32} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentName}>{c.displayName} · <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text></Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor={MUTED}
            style={styles.input}
            multiline
            accessibilityLabel="Comment text"
          />
          <Pressable onPress={() => void send()} disabled={!isValidCommentText(text) || sending} accessibilityRole="button" accessibilityLabel="Send comment" style={styles.send}>
            <Text style={[styles.sendText, (!isValidCommentText(text) || sending) && styles.sendOff]}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.title, color: INK, fontWeight: '800' },
  body: { gap: spacing.sm, paddingBottom: spacing.lg },
  loading: { ...typography.body, color: MUTED, paddingVertical: spacing.lg },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, marginTop: spacing.md },
  empty: { ...typography.body, color: MUTED },
  comment: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  commentBubble: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, gap: 2 },
  commentName: { ...typography.caption, color: INK, fontWeight: '800' },
  commentTime: { color: MUTED, fontWeight: '600' },
  commentText: { ...typography.body, color: INK },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: TRACK },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flex: 1, maxHeight: 120, borderWidth: 1, borderColor: TRACK },
  send: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sendText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  sendOff: { opacity: 0.4 },
});
