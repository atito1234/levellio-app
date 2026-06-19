import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeroAvatar, PostCard, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { usePlan } from '@/state/PlanContext';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import { isValidCommentText, timeAgo, type Comment, type Post, type SuggestedHabit } from '@/lib/community';
import type { QuestCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

/** A post + its comment thread. For "ask" posts, peers can attach a habit the asker adopts in one tap. */
export function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { t } = useTranslation(['feed', 'common']);
  const { subscribeFeed, subscribeComments, addComment } = useCommunity();
  const { quests, addQuest } = useGame();
  const { linkHabit } = useProjects();
  const { getPlan, togglePlanned } = usePlan();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // "Attach a habit" composer state (for answering an ask).
  const [attachOpen, setAttachOpen] = useState(false);
  const [hTitle, setHTitle] = useState('');
  const [hCat, setHCat] = useState<QuestCategory>('health');

  useEffect(() => {
    const unsub = subscribeFeed('all', (posts) => setPost(posts.find((p) => p.id === postId) ?? null));
    return unsub;
  }, [postId, subscribeFeed]);
  useEffect(() => {
    const unsub = subscribeComments(postId, setComments);
    return unsub;
  }, [postId, subscribeComments]);

  const isAsk = post?.kind === 'ask';

  const send = async () => {
    if (!isValidCommentText(text) || sending) return;
    setSending(true);
    try {
      const suggested: SuggestedHabit | undefined =
        attachOpen && hTitle.trim().length > 0 ? { title: hTitle.trim(), category: hCat, contribution: 1 } : undefined;
      await addComment(postId, text, suggested);
      setText('');
      setHTitle('');
      setAttachOpen(false);
    } finally {
      setSending(false);
    }
  };

  /** One-tap adopt of a peer's suggested habit → a daily habit, linked + planned. */
  const adoptSuggestion = async (s: SuggestedHabit) => {
    const existing = quests.find((q) => q.title.trim().toLowerCase() === s.title.trim().toLowerCase());
    const id = existing?.id ?? (await addQuest({ title: s.title, category: s.category, difficulty: 'easy', scheduledDays: [0, 1, 2, 3, 4, 5, 6] }))?.id;
    if (!id) return;
    if (post?.projectId) await linkHabit(id, post.projectId);
    const todayK = dayKey(new Date());
    if (!(getPlan(todayK) ?? []).includes(id)) await togglePlanned(todayK, id);
    Alert.alert(
      t('feed:detail.adoptedTitle'),
      post?.projectTitle
        ? t('feed:detail.adoptedBodyProject', { habit: s.title, project: post.projectTitle })
        : t('feed:detail.adoptedBody', { habit: s.title }),
    );
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common:action.back')} hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{isAsk ? t('feed:detail.titleAsk') : t('feed:detail.titlePost')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {post ? <PostCard post={post} onOpen={() => undefined} /> : <Text style={styles.loading}>{t('feed:detail.loading')}</Text>}

          <Text style={styles.sectionLabel}>
            {isAsk
              ? comments.length > 0
                ? t(comments.length === 1 ? 'feed:detail.answers_one' : 'feed:detail.answers_other', { count: comments.length })
                : t('feed:detail.answersEmpty')
              : comments.length > 0
                ? t(comments.length === 1 ? 'feed:detail.comments_one' : 'feed:detail.comments_other', { count: comments.length })
                : t('feed:detail.commentsEmpty')}
          </Text>
          {comments.length === 0 ? (
            <Text style={styles.empty}>{isAsk ? t('feed:detail.emptyAsk') : t('feed:detail.emptyPost')}</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <HeroAvatar presentation={c.presentation ?? 'neutral'} tier="novice" size={32} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentName}>{c.displayName} · <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text></Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                  {c.suggestedHabit && (
                    <Pressable
                      onPress={() => void adoptSuggestion(c.suggestedHabit!)}
                      accessibilityRole="button"
                      accessibilityLabel={t('feed:detail.adoptA11y', { habit: c.suggestedHabit.title })}
                      style={styles.adoptSuggestion}
                    >
                      <Text style={styles.adoptSuggestionText}>
                        {t('feed:detail.adopt', { icon: CATEGORY_META[c.suggestedHabit.category].icon, habit: c.suggestedHabit.title })}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Attach-a-habit (answers to an ask can carry an adoptable habit). */}
        {isAsk && attachOpen && (
          <View style={styles.attach}>
            <TextInput
              value={hTitle}
              onChangeText={setHTitle}
              placeholder={t('feed:detail.attachPlaceholder')}
              placeholderTextColor={MUTED}
              style={styles.attachInput}
              maxLength={60}
              accessibilityLabel={t('feed:detail.attachA11y')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachChips}>
              {CATEGORY_ORDER.map((cat) => {
                const on = hCat === cat;
                return (
                  <Pressable key={cat} onPress={() => setHCat(cat)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.attachChip, on && styles.attachChipOn]}>
                    <Text style={[styles.attachChipText, on && styles.attachChipTextOn]}>{CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputRow}>
          {isAsk && (
            <Pressable onPress={() => setAttachOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={t('feed:detail.attachToggleA11y')} style={styles.attachToggle} hitSlop={6}>
              <Text style={[styles.attachToggleText, attachOpen && { color: TEAL }]}>＋🌱</Text>
            </Pressable>
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isAsk ? t('feed:detail.answerPlaceholder') : t('feed:detail.commentPlaceholder')}
            placeholderTextColor={MUTED}
            style={styles.input}
            multiline
            accessibilityLabel={isAsk ? t('feed:detail.answerA11y') : t('feed:detail.commentA11y')}
          />
          <Pressable onPress={() => void send()} disabled={!isValidCommentText(text) || sending} accessibilityRole="button" accessibilityLabel={t('common:action.send')} style={styles.send}>
            <Text style={[styles.sendText, (!isValidCommentText(text) || sending) && styles.sendOff]}>{t('common:action.send')}</Text>
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
  commentBubble: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: spacing.md, gap: spacing.xs },
  commentName: { ...typography.caption, color: INK, fontWeight: '800' },
  commentTime: { color: MUTED, fontWeight: '600' },
  commentText: { ...typography.body, color: INK },
  adoptSuggestion: { alignSelf: 'flex-start', backgroundColor: '#EAFBF6', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: 2 },
  adoptSuggestionText: { ...typography.label, color: '#0A6E5C', fontWeight: '800' },
  attach: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: TRACK },
  attachInput: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  attachChips: { gap: spacing.xs, paddingVertical: 2 },
  attachChip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: TRACK },
  attachChipOn: { backgroundColor: '#EDE9FE', borderColor: VIOLET },
  attachChipText: { ...typography.caption, color: MUTED, fontWeight: '700' },
  attachChipTextOn: { color: VIOLET, fontWeight: '800' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: TRACK },
  attachToggle: { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  attachToggleText: { fontSize: 20, color: MUTED },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flex: 1, maxHeight: 120, borderWidth: 1, borderColor: TRACK },
  send: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sendText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  sendOff: { opacity: 0.4 },
});
