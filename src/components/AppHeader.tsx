/**
 * Persistent identity + reach bar for the main tabs: your hero avatar (→ your
 * profile when signed in, else the Hero screen) with a streak flame, plus quick
 * access to Notifications and Inbox with unread badges. Gives every tab the same
 * recognizable chrome so "where do I go?" is always answered the same way.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useCommunity } from '@/state/CommunityContext';
import { useNotifications } from '@/state/NotificationsContext';
import { useMessaging } from '@/state/MessagingContext';
import { HeroAvatar } from './HeroAvatar';
import { PressableScale } from './PressableScale';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * `compact` drops the avatar/streak identity block and shows only the
 * notifications + inbox actions — for the Today screen, whose greeting row
 * already presents the hero, so we don't duplicate identity.
 */
export function AppHeader({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation(['feed', 'messaging']);
  const { character } = useGame();
  const { uid } = useCommunity();
  const { unreadCount } = useNotifications();
  const { unreadCount: msgUnread } = useMessaging();

  const openProfile = () =>
    uid ? navigation.navigate('Profile', { uid }) : navigation.navigate('Main', { screen: 'Character' });

  return (
    <View style={styles.bar}>
      {variant === 'full' && (
        <PressableScale onPress={openProfile} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.meA11y')} style={styles.identity}>
          <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={36} />
          {(character?.streakDays ?? 0) > 0 && (
            <View style={styles.streak}>
              <Text style={styles.streakText}>🔥 {character?.streakDays}</Text>
            </View>
          )}
        </PressableScale>
      )}

      <View style={styles.spacer} />

      <PressableScale onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.notificationsA11y')} style={styles.iconBtn}>
        <Text style={styles.icon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
        )}
      </PressableScale>
      <PressableScale onPress={() => navigation.navigate('Inbox')} accessibilityRole="button" accessibilityLabel={t('messaging:a11y')} style={styles.iconBtn}>
        <Text style={styles.icon}>💬</Text>
        {msgUnread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{msgUnread > 9 ? '9+' : msgUnread}</Text></View>
        )}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  streak: { backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  streakText: { ...typography.caption, color: colors.textPrimary, fontWeight: '800' },
  spacer: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  icon: { fontSize: 18 },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#C0202C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800', fontSize: 9 },
});
