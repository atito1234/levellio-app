import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useProjects } from '@/state/ProjectsContext';
import { getBucketColor } from '@/lib/buckets';
import { MAX_POST_TEXT, isValidPostText } from '@/lib/community';
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
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState<string | null>(route.params?.projectId ?? null);
  const [posting, setPosting] = useState(false);

  const canPost = isValidPostText(text) && !posting;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    const project = myProjects.find((p) => p.id === projectId);
    const ok = await createPost({
      text,
      ...(project ? { projectId: project.id, projectTitle: project.title, projectColorId: project.colorId } : {}),
    });
    if (ok) navigation.goBack();
    else setPosting(false);
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>New post</Text>
          <Pressable onPress={() => void submit()} disabled={!canPost} accessibilityRole="button" accessibilityLabel="Post" hitSlop={12}>
            <Text style={[styles.post, !canPost && styles.postOff]}>Post</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Share a win, ask for support, or cheer someone on…"
            placeholderTextColor={MUTED}
            style={styles.input}
            multiline
            autoFocus
            maxLength={MAX_POST_TEXT}
            accessibilityLabel="Post text"
          />
          <Text style={styles.counter}>{text.length}/{MAX_POST_TEXT}</Text>

          {myProjects.length > 0 && (
            <>
              <Text style={styles.label}>Share to a project (optional)</Text>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK, maxWidth: 240 },
  chipText: { ...typography.label, color: INK, fontWeight: '600' },
});
