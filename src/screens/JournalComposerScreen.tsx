import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, HeroAvatar } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useJournal } from '@/state/JournalContext';
import { MOODS, AUDIENCES, type JournalAudience, type JournalMedia, type JournalMood } from '@/lib/journal';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalComposer'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

export function JournalComposerScreen({ route, navigation }: Props) {
  const { t } = useTranslation('journal');
  const { dragonId, dragonName, questIds, prompt, teaching } = route.params ?? {};
  const { character } = useGame();
  const { addEntry } = useJournal();

  const [text, setText] = useState('');
  const [mood, setMood] = useState<JournalMood | undefined>(undefined);
  const [audience, setAudience] = useState<JournalAudience>('private');
  const [media, setMedia] = useState<JournalMedia | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const canPost = (text.trim().length > 0 || !!media) && !saving;

  const pickMedia = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('composer.permTitle'), t('composer.permBody'));
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.6,
        videoMaxDuration: 60,
      });
      const asset = res.canceled ? null : res.assets[0];
      if (asset) setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' });
    } catch {
      Alert.alert(t('composer.mediaErrorTitle'), t('composer.mediaErrorBody'));
    }
  };

  const post = async () => {
    if (!canPost) return;
    setSaving(true);
    await addEntry({ text, audience, mood, media, dragonId, dragonName, questIds });
    navigation.goBack();
  };

  const audNote = t(`audience.${audience}.note`);

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('composer.a11yCancel')} hitSlop={12}>
          <Text style={styles.cancel}>{t('common:action.cancel')}</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('composer.title')}
        </Text>
        <Pressable onPress={() => void post()} disabled={!canPost} accessibilityRole="button" accessibilityLabel={t('composer.a11yPost')} hitSlop={12}>
          <Text style={[styles.post, !canPost && styles.postOff]}>{t('composer.post')}</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Post header — you + audience (LinkedIn-style). */}
        <View style={styles.header}>
          <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.you}>{t('composer.you')}</Text>
            {dragonName ? <Text style={styles.context}>{t('composer.battling', { name: dragonName })}</Text> : <Text style={styles.context}>{t('composer.battleReflection')}</Text>}
          </View>
        </View>

        {teaching ? (
          <View style={styles.teachingCard}>
            <Text style={styles.teachingLabel}>{t('composer.teachingLabel')}</Text>
            <Text style={styles.teachingText}>{teaching}</Text>
          </View>
        ) : null}

        {prompt ? <Text style={styles.promptText}>{prompt}</Text> : null}

        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          placeholder={prompt ?? t('composer.inputPlaceholder')}
          placeholderTextColor={MUTED}
          style={styles.input}
          accessibilityLabel={t('composer.a11yReflection')}
        />

        {media && (
          <View style={styles.mediaWrap}>
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.mediaImage} accessibilityLabel={t('composer.a11yPhoto')} />
            ) : (
              <View style={styles.videoTile}>
                <Text style={styles.videoTileText}>{t('composer.videoAttached')}</Text>
              </View>
            )}
            <Pressable onPress={() => setMedia(undefined)} accessibilityRole="button" accessibilityLabel={t('composer.a11yRemoveMedia')} style={styles.mediaRemove}>
              <Text style={styles.mediaRemoveText}>✕</Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={() => void pickMedia()} accessibilityRole="button" accessibilityLabel={t('composer.a11yAddMedia')} style={styles.mediaBtn}>
          <Text style={styles.mediaBtnText}>{media ? t('composer.replaceMedia') : t('composer.addMedia')}</Text>
        </Pressable>

        <Text style={styles.fieldLabel}>{t('composer.feelLabel')}</Text>
        <View style={styles.chips}>
          {MOODS.map((m) => {
            const on = mood === m.id;
            const label = t(`mood.${m.id}`);
            return (
              <Pressable
                key={m.id}
                onPress={() => setMood(on ? undefined : m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.emoji} {label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>{t('composer.audienceLabel')}</Text>
        <View style={styles.chips}>
          {AUDIENCES.map((a) => {
            const on = audience === a.id;
            const label = t(`audience.${a.id}.label`);
            const note = t(`audience.${a.id}.note`);
            return (
              <Pressable
                key={a.id}
                onPress={() => setAudience(a.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${label}. ${note}`}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.icon} {label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.audienceNote}>{audNote} {t('composer.audienceNoteSuffix')}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  cancel: { ...typography.label, color: MUTED },
  title: { ...typography.heading, color: INK },
  post: { ...typography.label, color: VIOLET, fontWeight: '800' },
  postOff: { color: MUTED, opacity: 0.5 },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  you: { ...typography.body, color: INK, fontWeight: '800' },
  context: { ...typography.caption, color: MUTED },

  teachingCard: { backgroundColor: VIOLET_SOFT, borderRadius: radii.lg, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: '#E2DBFB' },
  teachingLabel: { ...typography.caption, color: VIOLET, fontWeight: '800', letterSpacing: 1 },
  teachingText: { ...typography.body, color: INK },
  promptText: { ...typography.title, color: INK, fontWeight: '800' },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: TRACK },

  mediaWrap: { position: 'relative' },
  mediaImage: { width: '100%', height: 200, borderRadius: radii.lg, backgroundColor: TRACK },
  videoTile: { width: '100%', height: 120, borderRadius: radii.lg, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  videoTileText: { ...typography.body, color: VIOLET, fontWeight: '700' },
  mediaRemove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: radii.pill, backgroundColor: 'rgba(31,41,55,0.7)', alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText: { color: '#FFFFFF', fontWeight: '800' },
  mediaBtn: { alignSelf: 'flex-start', backgroundColor: CARD, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  mediaBtnText: { ...typography.label, color: INK, fontWeight: '600' },

  fieldLabel: { ...typography.label, color: MUTED, letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.label, color: MUTED, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '700' },
  audienceNote: { ...typography.caption, color: MUTED },
});
