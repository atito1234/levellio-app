import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, HeroAvatar } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useJournal } from '@/state/JournalContext';
import { MOODS, AUDIENCES, audienceMeta, type JournalAudience, type JournalMedia, type JournalMood } from '@/lib/journal';
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
        Alert.alert('Photos access needed', 'Allow photo access in Settings to attach a photo or video.');
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
      Alert.alert('Couldn’t add media', 'Something went wrong picking that file.');
    }
  };

  const post = async () => {
    if (!canPost) return;
    setSaving(true);
    await addEntry({ text, audience, mood, media, dragonId, dragonName, questIds });
    navigation.goBack();
  };

  const aud = audienceMeta(audience);

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Reflect
        </Text>
        <Pressable onPress={() => void post()} disabled={!canPost} accessibilityRole="button" accessibilityLabel="Post reflection" hitSlop={12}>
          <Text style={[styles.post, !canPost && styles.postOff]}>Post</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Post header — you + audience (LinkedIn-style). */}
        <View style={styles.header}>
          <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.you}>You</Text>
            {dragonName ? <Text style={styles.context}>Battling {dragonName}</Text> : <Text style={styles.context}>Battle reflection</Text>}
          </View>
        </View>

        {teaching ? (
          <View style={styles.teachingCard}>
            <Text style={styles.teachingLabel}>🧠 WHY THIS MATTERS</Text>
            <Text style={styles.teachingText}>{teaching}</Text>
          </View>
        ) : null}

        {prompt ? <Text style={styles.promptText}>{prompt}</Text> : null}

        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          multiline
          placeholder={prompt ?? 'What’s stopping you from this habit? Name the dragon…'}
          placeholderTextColor={MUTED}
          style={styles.input}
          accessibilityLabel="Your reflection"
        />

        {media && (
          <View style={styles.mediaWrap}>
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.mediaImage} accessibilityLabel="Attached photo" />
            ) : (
              <View style={styles.videoTile}>
                <Text style={styles.videoTileText}>🎥 Video attached</Text>
              </View>
            )}
            <Pressable onPress={() => setMedia(undefined)} accessibilityRole="button" accessibilityLabel="Remove media" style={styles.mediaRemove}>
              <Text style={styles.mediaRemoveText}>✕</Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={() => void pickMedia()} accessibilityRole="button" accessibilityLabel="Add photo or video" style={styles.mediaBtn}>
          <Text style={styles.mediaBtnText}>📷 {media ? 'Replace photo / video' : 'Add photo / video'}</Text>
        </Pressable>

        <Text style={styles.fieldLabel}>How does this make you feel?</Text>
        <View style={styles.chips}>
          {MOODS.map((m) => {
            const on = mood === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMood(on ? undefined : m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={m.label}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{m.emoji} {m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Who can see this?</Text>
        <View style={styles.chips}>
          {AUDIENCES.map((a) => {
            const on = audience === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setAudience(a.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${a.label}. ${a.note}`}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.icon} {a.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.audienceNote}>{aud.note} Sharing & reactions from others arrive with the community update.</Text>
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

  teachingCard: { backgroundColor: VIOLET_SOFT, borderRadius: 14, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: '#E2DBFB' },
  teachingLabel: { ...typography.caption, color: VIOLET, fontWeight: '800', letterSpacing: 1 },
  teachingText: { ...typography.body, color: INK },
  promptText: { ...typography.title, color: INK, fontWeight: '800' },
  input: { ...typography.body, color: INK, backgroundColor: CARD, borderRadius: 16, padding: spacing.md, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: TRACK },

  mediaWrap: { position: 'relative' },
  mediaImage: { width: '100%', height: 200, borderRadius: 16, backgroundColor: TRACK },
  videoTile: { width: '100%', height: 120, borderRadius: 16, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  videoTileText: { ...typography.body, color: VIOLET, fontWeight: '700' },
  mediaRemove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 999, backgroundColor: 'rgba(31,41,55,0.7)', alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText: { color: '#FFFFFF', fontWeight: '800' },
  mediaBtn: { alignSelf: 'flex-start', backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  mediaBtnText: { ...typography.label, color: INK, fontWeight: '600' },

  fieldLabel: { ...typography.label, color: MUTED, letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  chipOn: { backgroundColor: VIOLET_SOFT, borderColor: VIOLET },
  chipText: { ...typography.label, color: MUTED, fontWeight: '600' },
  chipTextOn: { color: VIOLET, fontWeight: '700' },
  audienceNote: { ...typography.caption, color: MUTED },
});
