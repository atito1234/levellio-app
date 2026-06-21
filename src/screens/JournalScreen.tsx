import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, HeroAvatar } from '@/components';
import { spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useJournal } from '@/state/JournalContext';
import { audienceMeta, moodMeta, type JournalEntry } from '@/lib/journal';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Journal'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const VIOLET_SOFT = '#EDE9FE';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

function relativeTime(ms: number, translate: TFunction): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return translate('time.justNow');
  if (min < 60) return translate('time.minutes', { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return translate('time.hours', { n: hr });
  const d = Math.floor(hr / 24);
  return translate('time.days', { n: d });
}

export function JournalScreen({ route, navigation }: Props) {
  const { t } = useTranslation('journal');
  const dragonId = route.params?.dragonId;
  const { character } = useGame();
  const { entries } = useJournal();

  const list = useMemo(
    () => (dragonId ? entries.filter((e) => e.dragonId === dragonId) : entries),
    [entries, dragonId],
  );

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('list.a11yBack')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('list.title')}
        </Text>
        <Pressable onPress={() => navigation.navigate('JournalComposer')} accessibilityRole="button" accessibilityLabel={t('list.a11yNew')} hitSlop={12}>
          <Text style={styles.new}>＋</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.banner}>{t('list.banner')}</Text>
        {list.length === 0 ? (
          <Text style={styles.empty}>{t('list.empty')}</Text>
        ) : (
          list.map((e) => <EntryCard key={e.id} entry={e} presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} />)
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function EntryCard({
  entry,
  presentation,
  tier,
  kitId,
}: {
  entry: JournalEntry;
  presentation: 'female' | 'male' | 'neutral';
  tier: 'novice' | 'pathfinder' | 'luminary';
  kitId?: string;
}) {
  const { t } = useTranslation('journal');
  const { addFollowUp } = useJournal();
  const [note, setNote] = useState('');
  const aud = audienceMeta(entry.audience);
  const audLabel = t(`audience.${entry.audience}.label`);
  const mood = moodMeta(entry.mood);
  const moodLabel = entry.mood ? t(`mood.${entry.mood}`) : '';

  const send = async () => {
    if (note.trim().length === 0) return;
    await addFollowUp(entry.id, note);
    setNote('');
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <HeroAvatar presentation={presentation} tier={tier} kitId={kitId} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.you}>{t('card.you')}</Text>
          <Text style={styles.meta}>
            {aud.icon} {audLabel} · {relativeTime(entry.createdAt, t)}
            {entry.dragonName ? ` · ${entry.dragonName}` : ''}
          </Text>
        </View>
      </View>

      {entry.text.length > 0 && <Text style={styles.body}>{entry.text}</Text>}

      {entry.media &&
        (entry.media.type === 'image' ? (
          <Image source={{ uri: entry.media.uri }} style={styles.media} accessibilityLabel={t('card.a11yPhoto')} />
        ) : (
          <View style={styles.videoTile}>
            <Text style={styles.videoTileText}>{t('card.videoAttached')}</Text>
          </View>
        ))}

      {mood && (
        <View style={styles.moodRow}>
          <Text style={styles.moodChip}>{mood.emoji} {moodLabel}</Text>
        </View>
      )}

      {entry.followUps.length > 0 && (
        <View style={styles.thread}>
          {entry.followUps.map((f) => (
            <View key={f.id} style={styles.note}>
              <Text style={styles.noteText}>{f.text}</Text>
              <Text style={styles.noteTime}>{relativeTime(f.createdAt, t)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.addNoteRow}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('card.notePlaceholder')}
          placeholderTextColor={MUTED}
          style={styles.noteInput}
          accessibilityLabel={t('card.a11yAddNote')}
        />
        <Pressable onPress={() => void send()} disabled={note.trim().length === 0} accessibilityRole="button" accessibilityLabel={t('card.a11ySaveNote')} style={styles.noteSend}>
          <Text style={[styles.noteSendText, note.trim().length === 0 && styles.noteSendOff]}>{t('card.noteButton')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK },
  new: { fontSize: 26, color: VIOLET, fontWeight: '800', width: 28, textAlign: 'right' },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  banner: { ...typography.caption, color: MUTED, backgroundColor: VIOLET_SOFT, borderRadius: 12, padding: spacing.sm },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingTop: spacing.xl },

  card: { backgroundColor: CARD, borderRadius: 20, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: TRACK },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  you: { ...typography.body, color: INK, fontWeight: '800' },
  meta: { ...typography.caption, color: MUTED },
  body: { ...typography.body, color: INK },
  media: { width: '100%', height: 200, borderRadius: 14, backgroundColor: TRACK },
  videoTile: { width: '100%', height: 110, borderRadius: 14, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  videoTileText: { ...typography.body, color: VIOLET, fontWeight: '700' },

  moodRow: { flexDirection: 'row' },
  moodChip: { ...typography.label, color: VIOLET, fontWeight: '700', backgroundColor: VIOLET_SOFT, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },

  thread: { gap: spacing.xs, borderLeftWidth: 2, borderLeftColor: TRACK, paddingLeft: spacing.md },
  note: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  noteText: { ...typography.body, color: INK, flex: 1 },
  noteTime: { ...typography.caption, color: MUTED },

  addNoteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noteInput: { ...typography.body, color: INK, flex: 1, backgroundColor: BG, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  noteSend: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  noteSendText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  noteSendOff: { color: MUTED, opacity: 0.5 },
});
