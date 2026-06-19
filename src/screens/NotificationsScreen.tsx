import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeroAvatar, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useNotifications } from '@/state/NotificationsContext';
import { groupByRecency, type AppNotification, type RecencyBucket } from '@/lib/notifications';
import { timeAgo } from '@/lib/community';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const ORDER: RecencyBucket[] = ['today', 'week', 'earlier'];

export function NotificationsScreen({ navigation }: Props) {
  const { t } = useTranslation(['notifications', 'common']);
  const { items, markAllRead } = useNotifications();

  // Opening the inbox clears the unread badge.
  useEffect(() => {
    void markAllRead();
  }, [markAllRead]);

  const groups = groupByRecency(items);

  const open = (n: AppNotification) => {
    if (n.postId) navigation.navigate('PostDetail', { postId: n.postId });
    else navigation.navigate('Profile', { uid: n.actorUid });
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t('notifications:title')}</Text>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{t('notifications:empty')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {ORDER.filter((b) => groups[b].length > 0).map((bucket) => (
            <View key={bucket} style={styles.group}>
              <Text style={styles.groupLabel}>{t(`notifications:groups.${bucket}`)}</Text>
              {groups[bucket].map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => open(n)}
                  accessibilityRole="button"
                  style={[styles.row, !n.read && styles.rowUnread]}
                >
                  <HeroAvatar presentation={n.actorPresentation ?? 'neutral'} tier="novice" size={36} />
                  <Text style={styles.line} numberOfLines={2}>
                    {t(`notifications:line.${n.type}`, { name: n.actorName, emoji: n.emoji ?? '' })}
                  </Text>
                  <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.textPrimary, paddingVertical: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { ...typography.body, color: colors.textMuted },
  scroll: { gap: spacing.lg, paddingBottom: spacing.xl },
  group: { gap: spacing.xs },
  groupLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { backgroundColor: colors.violetSoft, borderColor: colors.violetMuted },
  line: { ...typography.body, color: colors.textPrimary, flex: 1 },
  time: { ...typography.caption, color: colors.textMuted },
});
