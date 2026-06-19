import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeroAvatar, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useMessaging } from '@/state/MessagingContext';
import { isUnread, otherName, otherParticipant } from '@/lib/messaging';
import { timeAgo } from '@/lib/community';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Inbox'>;

export function InboxScreen({ navigation }: Props) {
  const { t } = useTranslation(['messaging', 'common']);
  const { threads, myUid } = useMessaging();

  if (!myUid) {
    return (
      <ScreenContainer>
        <Text style={styles.title}>{t('messaging:title')}</Text>
        <View style={styles.center}><Text style={styles.empty}>{t('messaging:empty')}</Text></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t('messaging:title')}</Text>
      {threads.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>{t('messaging:empty')}</Text></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {threads.map((th) => {
            const otherUid = otherParticipant(th, myUid);
            const unread = isUnread(th, myUid);
            return (
              <Pressable
                key={th.id}
                onPress={() => navigation.navigate('Chat', { uid: otherUid, displayName: otherName(th, myUid), presentation: th.presentations[otherUid] })}
                accessibilityRole="button"
                style={styles.row}
              >
                <HeroAvatar presentation={th.presentations[otherUid] ?? 'neutral'} tier="novice" size={44} />
                <View style={styles.rowText}>
                  <Text style={[styles.name, unread && styles.bold]} numberOfLines={1}>{otherName(th, myUid)}</Text>
                  <Text style={[styles.preview, unread && styles.bold]} numberOfLines={1}>{th.lastText}</Text>
                </View>
                <View style={styles.rowEnd}>
                  {th.lastAt > 0 ? <Text style={styles.time}>{timeAgo(th.lastAt)}</Text> : null}
                  {unread ? <View style={styles.dot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.textPrimary, paddingVertical: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  scroll: { gap: spacing.sm, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowText: { flex: 1 },
  name: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  preview: { ...typography.caption, color: colors.textSecondary },
  bold: { fontWeight: '800', color: colors.textPrimary },
  rowEnd: { alignItems: 'flex-end', gap: spacing.xs },
  time: { ...typography.caption, color: colors.textMuted },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.identity },
});
