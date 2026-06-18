import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useProjects } from '@/state/ProjectsContext';
import { getBucketColor } from '@/lib/buckets';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { MAX_POST_TEXT, isValidPostText } from '@/lib/community';
import type { QuestCategory } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PostComposer'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

/** Compose a community post — optionally scoped to one of your projects. */
export function PostComposerScreen({ route, navigation }: Props) {
  const { createPost } = useCommunity();
  const { myProjects } = useProjects();
  const isAsk = route.params?.kind === 'ask';
  const isWin = route.params?.kind === 'contribution';
  const winHabit = route.params?.habitTitle;
  const winValue = route.params?.value;
  const winMode = route.params?.mode;
  const winProject = myProjects.find((p) => p.id === route.params?.projectId);
  const [text, setText] = useState(
    isWin && winHabit ? `🎉 Just did ${winHabit}${winProject ? ` — +${winValue ?? 1} for ${winProject.title}` : ''}!` : '',
  );
  const [projectId, setProjectId] = useState<string | null>(route.params?.projectId ?? null);
  const [categoryHint, setCategoryHint] = useState<QuestCategory | null>(route.params?.categoryHint ?? null);
  const [posting, setPosting] = useState(false);

  const canPost = isValidPostText(text) && !posting;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    const project = myProjects.find((p) => p.id === projectId);
    const ok = await createPost({
      text,
      ...(isAsk ? { kind: 'ask' as const } : {}),
      ...(isAsk && categoryHint ? { categoryHint } : {}),
      ...(isWin ? { kind: 'contribution' as const, ...(winHabit ? { habitTitle: winHabit } : {}), ...(typeof winValue === 'number' ? { value: winValue } : {}), ...(winMode ? { mode: winMode } : {}) } : {}),
      ...(project ? { projectId: project.id, projectTitle: project.title, projectColorId: project.colorId } : {}),
    });
    if (ok) navigation.goBack();
    else setPosting(false);
  };

  const headerTitle = isAsk ? 'Ask peers' : isWin ? 'Share your win' : 'New post';
  const ctaLabel = isAsk ? 'Ask' : isWin ? 'Share' : 'Post';

  return (
    <ScreenContainer backgroundColor={BG}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{headerTitle}</Text>
          <Pressable onPress={() => void submit()} disabled={!canPost} accessibilityRole="button" accessibilityLabel={ctaLabel} hitSlop={12}>
            <Text style={[styles.post, !canPost && styles.postOff]}>{ctaLabel}</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {(() => {
            const sel = myProjects.find((p) => p.id === projectId);
            if (!sel) return null;
            const c = getBucketColor(sel.colorId);
            return (
              <View style={[styles.scopeBanner, { backgroundColor: c.soft }]}>
                <Text style={[styles.scopeText, { color: c.accent }]} numberOfLines={1}>
                  {isAsk ? '🌍 Asking in' : '🤝 Posting to'} {sel.emoji} {sel.title}
                </Text>
              </View>
            );
          })()}
          {isAsk && (
            <Text style={styles.askHint}>
              Describe the habit or problem you're working on. Peers who've solved it can answer — and attach a habit you adopt in one tap.
            </Text>
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isAsk ? 'e.g. How do you keep standing water from coming back after the rains?' : 'Share a win, ask for support, or cheer someone on…'}
            placeholderTextColor={MUTED}
            style={styles.input}
            multiline
            autoFocus
            maxLength={MAX_POST_TEXT}
            accessibilityLabel={isAsk ? 'Your question' : 'Post text'}
          />
          <Text style={styles.counter}>{text.length}/{MAX_POST_TEXT}</Text>

          {isAsk && (
            <>
              <Text style={styles.label}>What area is this about? (optional)</Text>
              <View style={styles.chips}>
                {CATEGORY_ORDER.map((cat) => {
                  const on = categoryHint === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategoryHint(on ? null : cat)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {myProjects.length > 0 && (
            <>
              <Text style={styles.label}>{isAsk ? 'Ask in which project?' : 'Share to a project (optional)'}</Text>
              <View style={styles.chips}>
                {myProjects.map((p) => {
                  const on = projectId === p.id;
                  const c = getBucketColor(p.colorId);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setProjectId(on ? null : p.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on && { backgroundColor: c.soft, borderColor: c.accent }]}
                    >
                      <Text style={[styles.chipText, on && { color: c.accent }]} numberOfLines={1}>{p.emoji} {p.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  cancel: { ...typography.label, color: MUTED, fontWeight: '700' },
  title: { ...typography.title, color: INK, fontWeight: '800' },
  post: { ...typography.label, color: VIOLET, fontWeight: '800' },
  postOff: { opacity: 0.4 },
  body: { gap: spacing.sm, paddingTop: spacing.md },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 16, padding: spacing.md, minHeight: 140, textAlignVertical: 'top', borderWidth: 1, borderColor: TRACK },
  counter: { ...typography.caption, color: MUTED, textAlign: 'right' },
  label: { ...typography.label, color: MUTED, letterSpacing: 1, marginTop: spacing.sm },
  askHint: { ...typography.caption, color: MUTED },
  scopeBanner: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scopeText: { ...typography.label, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK, maxWidth: 240 },
  chipOn: { backgroundColor: '#EDE9FE', borderColor: VIOLET },
  chipText: { ...typography.label, color: INK, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '800' },
});
