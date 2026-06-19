import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useNotifications } from '@/state/NotificationsContext';

const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';

/**
 * One-tap Follow / Following toggle (LinkedIn-style). Hidden for yourself.
 * Optimistic via the realtime following set in CommunityContext.
 */
export function FollowButton({ targetUid, size = 'sm' }: { targetUid: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation('common');
  const { uid, isFollowing, follow, unfollow } = useCommunity();
  const { notifyFollow } = useNotifications();
  if (!uid || uid === targetUid) return null;
  const on = isFollowing(targetUid);
  const toggle = async () => {
    if (on) {
      await unfollow(targetUid);
    } else {
      await follow(targetUid);
      notifyFollow(targetUid);
    }
  };
  return (
    <Pressable
      onPress={() => void toggle()}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? t('follow.a11yFollowing') : t('follow.a11yFollow')}
      style={[styles.btn, size === 'md' && styles.btnMd, on ? styles.on : styles.off]}
    >
      <Text style={[styles.text, on ? styles.textOn : styles.textOff]}>{on ? t('follow.following') : t('follow.follow')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1 },
  btnMd: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  off: { backgroundColor: VIOLET, borderColor: VIOLET },
  on: { backgroundColor: '#FFFFFF', borderColor: '#E2DBFB' },
  text: { ...typography.caption, fontWeight: '800' },
  textOff: { color: '#FFFFFF' },
  textOn: { color: MUTED },
});
