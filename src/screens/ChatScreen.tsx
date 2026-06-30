import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeroAvatar, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useMessaging } from '@/state/MessagingContext';
import { useCommunity } from '@/state/CommunityContext';
import { isValidMessageText, sortMessages, type Message } from '@/lib/messaging';
import { MEDIA_UPLOADS_ENABLED } from '@/config/features';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props) {
  const { uid, displayName, presentation } = route.params;
  const { t } = useTranslation(['messaging', 'common', 'feed']);
  const { openThreadWith, subscribeMessages, send, markRead, myUid } = useMessaging();
  const { requestReport, blockUser } = useCommunity();
  const openModeration = () =>
    Alert.alert(displayName ?? 'Hero', undefined, [
      { text: t('feed:report.reportUser', { name: displayName ?? 'Hero' }), onPress: () => requestReport({ type: 'user', id: uid, targetUid: uid, preview: displayName }) },
      { text: t('feed:post.block', { name: displayName ?? 'Hero' }), style: 'destructive', onPress: () => { void blockUser(uid); navigation.goBack(); } },
      { text: t('common:action.cancel'), style: 'cancel' },
    ]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Ensure the thread exists, then subscribe + mark read.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    void openThreadWith({ uid, displayName: displayName ?? 'Hero', presentation }).then((id) => {
      if (!id) return;
      setThreadId(id);
      unsub = subscribeMessages(id, (m) => setMessages(sortMessages(m)));
      void markRead(id);
    });
    return () => unsub?.();
  }, [uid, displayName, presentation, openThreadWith, subscribeMessages, markRead]);

  const onSend = async () => {
    if (!threadId || !isValidMessageText(text)) return;
    const body = text.trim();
    setText('');
    await send(threadId, body);
    void markRead(threadId);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common:action.back')} hitSlop={12}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Profile', { uid })} accessibilityRole="button" style={styles.peer}>
            <HeroAvatar presentation={presentation ?? 'neutral'} tier="novice" size={32} />
            <Text style={styles.peerName} numberOfLines={1}>{displayName ?? 'Hero'}</Text>
          </Pressable>
          <Pressable onPress={openModeration} accessibilityRole="button" accessibilityLabel={t('feed:post.moreA11y')} hitSlop={10}>
            <Text style={styles.chevron}>⋯</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => {
            const mine = m.senderUid === myUid;
            return (
              <View key={m.id} style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.msgText, mine && styles.msgTextMine]}>{m.text}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <Pressable
            onPress={() => Alert.alert(t('common:comingSoon.title'), t('common:comingSoon.body'))}
            accessibilityRole="button"
            accessibilityLabel={t('feed:composerScreen.mediaA11y')}
            style={[styles.mediaBtn, !MEDIA_UPLOADS_ENABLED && styles.mediaBtnOff]}
          >
            <Text style={styles.mediaIcon}>📷</Text>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('messaging:placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            accessibilityLabel={t('messaging:placeholder')}
          />
          <Pressable onPress={() => void onSend()} disabled={!isValidMessageText(text)} accessibilityRole="button" accessibilityLabel={t('common:action.send')} style={styles.send}>
            <Text style={[styles.sendText, !isValidMessageText(text) && styles.sendOff]}>{t('common:action.send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: colors.textPrimary, width: 28 },
  peer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  peerName: { ...typography.title, color: colors.textPrimary, fontWeight: '800', flex: 1 },
  body: { gap: spacing.xs, paddingVertical: spacing.md },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.identity, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  msgText: { ...typography.body, color: colors.textPrimary },
  msgTextMine: { color: colors.textOnBrand },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  mediaBtn: { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  mediaBtnOff: { opacity: 0.45 },
  mediaIcon: { fontSize: 20 },
  input: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flex: 1, maxHeight: 120, borderWidth: 1, borderColor: colors.border },
  send: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sendText: { ...typography.label, color: colors.identity, fontWeight: '800' },
  sendOff: { opacity: 0.4 },
});
