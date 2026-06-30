import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { CommunityGate, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useProjects } from '@/state/ProjectsContext';
import { useSettings } from '@/state/SettingsContext';
import { getBucketColor } from '@/lib/buckets';
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import { MAX_POST_TEXT, isValidPostText, type PostAudience, type PostMedia } from '@/lib/community';
import { screenText } from '@/lib/contentSafety';
import { uploadMedia } from '@/services/firebase/storage';
import { MEDIA_UPLOADS_ENABLED, AUDIENCE_CONTROLS_ENABLED } from '@/config/features';
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
  const { t } = useTranslation(['feed', 'common']);
  const { createPost, uid } = useCommunity();
  const { myProjects } = useProjects();
  const { settings, update } = useSettings();
  const isAsk = route.params?.kind === 'ask';
  const isWin = route.params?.kind === 'contribution';
  const winHabit = route.params?.habitTitle;
  const winValue = route.params?.value;
  const winMode = route.params?.mode;
  const winProject = myProjects.find((p) => p.id === route.params?.projectId);
  const [text, setText] = useState(
    isWin && winHabit
      ? winProject
        ? t('feed:composerScreen.winPrefillProject', { habit: winHabit, value: winValue ?? 1, project: winProject.title })
        : t('feed:composerScreen.winPrefill', { habit: winHabit })
      : '',
  );
  const [projectId, setProjectId] = useState<string | null>(route.params?.projectId ?? null);
  const [categoryHint, setCategoryHint] = useState<QuestCategory | null>(route.params?.categoryHint ?? null);
  const [media, setMedia] = useState<PostMedia | null>(null);
  const [posting, setPosting] = useState(false);
  // Audience: seed from the user's sticky default; 'ask' means they must choose.
  const [audience, setAudience] = useState<PostAudience | null>(
    settings.feedDefaultAudience === 'ask' ? null : settings.feedDefaultAudience,
  );
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Photo/video attach — disabled (shown) until the Firebase Blaze upgrade.
  const pickMedia = async () => {
    if (!MEDIA_UPLOADS_ENABLED) {
      Alert.alert(t('common:comingSoon.title'), t('common:comingSoon.body'));
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.6, videoMaxDuration: 60 });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset || !uid) return;
    const url = await uploadMedia(asset.uri, `users/${uid}/posts/${Date.now()}`);
    setMedia({ url, type: asset.type === 'video' ? 'video' : 'image' });
  };

  const needsAudience = AUDIENCE_CONTROLS_ENABLED && audience === null;
  const blocked = text.trim().length > 0 && !screenText(text).ok;
  const canPost = isValidPostText(text) && !posting && !needsAudience;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    if (AUDIENCE_CONTROLS_ENABLED && setAsDefault && audience) {
      await update({ feedDefaultAudience: audience });
    }
    const project = myProjects.find((p) => p.id === projectId);
    const ok = await createPost({
      text,
      ...(isAsk ? { kind: 'ask' as const } : {}),
      ...(isAsk && categoryHint ? { categoryHint } : {}),
      ...(isWin ? { kind: 'contribution' as const, ...(winHabit ? { habitTitle: winHabit } : {}), ...(typeof winValue === 'number' ? { value: winValue } : {}), ...(winMode ? { mode: winMode } : {}) } : {}),
      ...(project ? { projectId: project.id, projectTitle: project.title, projectColorId: project.colorId } : {}),
      ...(AUDIENCE_CONTROLS_ENABLED && audience ? { audience } : {}),
      ...(media ? { media } : {}),
    });
    if (ok) navigation.goBack();
    else setPosting(false);
  };

  const AUDIENCES: { id: PostAudience; icon: string }[] = [
    { id: 'public', icon: '🌍' },
    { id: 'friends', icon: '🤝' },
    { id: 'private', icon: '🔒' },
  ];

  const headerTitle = isAsk
    ? t('feed:composerScreen.titleAsk')
    : isWin
      ? t('feed:composerScreen.titleWin')
      : t('feed:composerScreen.titleNew');
  const ctaLabel = isAsk
    ? t('feed:composerScreen.ctaAsk')
    : isWin
      ? t('feed:composerScreen.ctaWin')
      : t('common:action.post');

  // Posting needs an account — show the unified gate instead of failing silently.
  if (!uid) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <CommunityGate onPrimary={() => navigation.navigate('SignIn')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={BG}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common:action.cancel')} hitSlop={12}>
            <Text style={styles.cancel}>{t('common:action.cancel')}</Text>
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
                  {isAsk ? t('feed:composerScreen.scopeAsk') : t('feed:composerScreen.scopePost')} {sel.emoji} {sel.title}
                </Text>
              </View>
            );
          })()}
          {isAsk && (
            <Text style={styles.askHint}>{t('feed:composerScreen.askHint')}</Text>
          )}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isAsk ? t('feed:composerScreen.placeholderAsk') : t('feed:composerScreen.placeholderPost')}
            placeholderTextColor={MUTED}
            style={styles.input}
            multiline
            autoFocus
            maxLength={MAX_POST_TEXT}
            accessibilityLabel={isAsk ? t('feed:composerScreen.a11yAsk') : t('feed:composerScreen.a11yPost')}
          />
          <Text style={styles.counter}>{t('feed:composerScreen.counter', { current: text.length, max: MAX_POST_TEXT })}</Text>
          {blocked && <Text style={styles.blocked}>{t('common:contentBlocked')}</Text>}

          {/* Audience — who can see this. Privacy-first: must be chosen unless a
              sticky default is set. */}
          {AUDIENCE_CONTROLS_ENABLED && (
            <>
              <Text style={styles.label}>{t('feed:composerScreen.audienceLabel')}</Text>
              <View style={styles.chips}>
                {AUDIENCES.map((a) => {
                  const on = audience === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setAudience(a.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.icon} {t(`feed:composerScreen.audience_${a.id}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {audience && (
                <Pressable onPress={() => setSetAsDefault((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: setAsDefault }} style={styles.defaultRow}>
                  <View style={[styles.defaultBox, setAsDefault && styles.defaultBoxOn]}>{setAsDefault && <Text style={styles.defaultCheck}>✓</Text>}</View>
                  <Text style={styles.defaultText}>{t('feed:composerScreen.setDefault')}</Text>
                </Pressable>
              )}
            </>
          )}

          {/* Photo/video attach — visible but disabled until media is enabled. */}
          <View style={styles.mediaRow}>
            <Pressable onPress={() => void pickMedia()} accessibilityRole="button" accessibilityLabel={t('feed:composerScreen.mediaA11y')} style={[styles.mediaBtn, !MEDIA_UPLOADS_ENABLED && styles.mediaBtnOff]}>
              <Text style={styles.mediaIcon}>📷</Text>
              <Text style={styles.mediaText}>{t('feed:composerScreen.mediaA11y')}</Text>
            </Pressable>
            {media ? (
              <Pressable onPress={() => setMedia(null)} accessibilityRole="button" style={styles.mediaThumbWrap}>
                <Image source={{ uri: media.url }} style={styles.mediaThumb} />
                <Text style={styles.mediaRemove}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {isAsk && (
            <>
              <Text style={styles.label}>{t('feed:composerScreen.areaLabel')}</Text>
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
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{CATEGORY_META[cat].icon} {t(`categories:${cat}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {myProjects.length > 0 && (
            <>
              <Text style={styles.label}>{isAsk ? t('feed:composerScreen.projectLabelAsk') : t('feed:composerScreen.projectLabelPost')}</Text>
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
  blocked: { ...typography.caption, color: '#C0202C', fontWeight: '700' },
  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  mediaBtnOff: { opacity: 0.45 },
  mediaIcon: { fontSize: 16 },
  mediaText: { ...typography.label, color: MUTED, fontWeight: '700' },
  mediaThumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden' },
  mediaThumb: { width: 44, height: 44 },
  mediaRemove: { position: 'absolute', top: 0, right: 2, color: '#FFFFFF', fontWeight: '800' },
  label: { ...typography.label, color: MUTED, letterSpacing: 1, marginTop: spacing.sm },
  askHint: { ...typography.caption, color: MUTED },
  scopeBanner: { borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scopeText: { ...typography.label, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK, maxWidth: 240 },
  chipOn: { backgroundColor: '#EDE9FE', borderColor: VIOLET },
  chipText: { ...typography.label, color: INK, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '800' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  defaultBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: TRACK, alignItems: 'center', justifyContent: 'center' },
  defaultBoxOn: { backgroundColor: VIOLET, borderColor: VIOLET },
  defaultCheck: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  defaultText: { ...typography.caption, color: MUTED },
});
