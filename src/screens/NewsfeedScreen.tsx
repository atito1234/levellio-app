import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeroAvatar, PostCard, PressableScale, ScreenContainer, StoriesRail } from '@/components';
import { spacing, typography } from '@/theme';
import { durations, springs } from '@/theme/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCommunity } from '@/state/CommunityContext';
import { useNotifications } from '@/state/NotificationsContext';
import { useMessaging } from '@/state/MessagingContext';
import { useGame } from '@/state/GameContext';
import { useCommunityAccess } from '@/services/community/access';
import { type FeedScope, type Post } from '@/lib/community';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';

type ScopeKey = 'all' | 'network';

/** The community newsfeed — composer up top, scope tabs, realtime post list. */
export function NewsfeedScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation(['feed', 'common', 'messaging']);
  const allowed = useCommunityAccess();
  const { uid, signedIn, subscribeFeed } = useCommunity();
  const { unreadCount } = useNotifications();
  const { unreadCount: msgUnread } = useMessaging();
  const { character } = useGame();
  const reduced = useReducedMotion();
  const [scope, setScope] = useState<ScopeKey>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Sliding scope-tab indicator.
  const [tabsW, setTabsW] = useState(0);
  const tabX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const to = scope === 'all' ? 0 : 1;
    if (reduced) tabX.setValue(to);
    else Animated.spring(tabX, { toValue: to, ...springs.gentle }).start();
  }, [scope, reduced, tabX]);
  const tabHalf = tabsW > 0 ? (tabsW - 8) / 2 : 0;

  const feedScope: FeedScope = scope;
  useEffect(() => {
    if (!signedIn || !allowed) return;
    const unsub = subscribeFeed(feedScope, setPosts);
    return unsub;
  }, [signedIn, allowed, feedScope, subscribeFeed]);

  // The feed is realtime; pull-to-refresh is a tactile reassurance beat.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  const header = useMemo(
    () => (
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('feed:newsfeed.title')}</Text>
        <View style={styles.headerActions}>
          <PressableScale onPress={() => navigation.navigate('People')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.peopleA11y')} style={styles.peopleBtn}>
            <Text style={styles.peopleText}>{t('feed:newsfeed.people')}</Text>
          </PressableScale>
          <PressableScale onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.notificationsA11y')} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </PressableScale>
          <PressableScale onPress={() => navigation.navigate('Inbox')} accessibilityRole="button" accessibilityLabel={t('messaging:a11y')} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>💬</Text>
            {msgUnread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{msgUnread > 9 ? '9+' : msgUnread}</Text>
              </View>
            )}
          </PressableScale>
          {uid && (
            <PressableScale onPress={() => navigation.navigate('Profile', { uid })} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.meA11y')} style={styles.meBtn}>
              <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={32} />
            </PressableScale>
          )}
        </View>
      </View>
    ),
    [navigation, t, unreadCount, msgUnread, uid, character?.presentation, character?.tier, character?.kitId],
  );

  if (!allowed) {
    return (
      <ScreenContainer backgroundColor={BG}>
        {header}
        <View style={styles.center}>
          <Text style={styles.lockEmoji}>✨</Text>
          <Text style={styles.lockTitle}>{t('feed:newsfeed.gateMemberTitle')}</Text>
          <Text style={styles.lockBody}>{t('feed:newsfeed.gateMemberBody')}</Text>
          <Pressable onPress={() => navigation.navigate('Paywall')} accessibilityRole="button" style={styles.cta}>
            <Text style={styles.ctaText}>{t('feed:newsfeed.gateMemberCta')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (!signedIn) {
    return (
      <ScreenContainer backgroundColor={BG}>
        {header}
        <View style={styles.center}>
          <Text style={styles.lockEmoji}>🤝</Text>
          <Text style={styles.lockTitle}>{t('feed:newsfeed.gateSignInTitle')}</Text>
          <Text style={styles.lockBody}>{t('feed:newsfeed.gateSignInBody')}</Text>
          <Pressable onPress={() => navigation.navigate('SignIn')} accessibilityRole="button" style={styles.cta}>
            <Text style={styles.ctaText}>{t('feed:newsfeed.gateSignInCta')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={BG} noPadding edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VIOLET} colors={[VIOLET]} />}
      >
        {header}

        {/* Stories rail (Instagram-style). "Add" is gated until media is enabled. */}
        <StoriesRail />

        {/* Search pill — opens discovery (LinkedIn-style). */}
        <PressableScale onPress={() => navigation.navigate('Discover')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.searchA11y')} style={styles.searchPill}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>{t('feed:newsfeed.searchPlaceholder')}</Text>
        </PressableScale>

        {/* Facebook-style composer — one tap to share. */}
        <PressableScale onPress={() => navigation.navigate('PostComposer')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.composerA11y')} style={styles.composer}>
          <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={40} />
          <Text style={styles.composerHint}>{t('feed:newsfeed.composerHint')}</Text>
          <Text style={styles.composerIcon}>✏️</Text>
        </PressableScale>

        {/* Scope tabs with a sliding indicator. */}
        <View style={styles.tabs} onLayout={(e) => setTabsW(e.nativeEvent.layout.width)}>
          {tabHalf > 0 && (
            <Animated.View
              style={[styles.tabIndicator, { width: tabHalf, transform: [{ translateX: tabX.interpolate({ inputRange: [0, 1], outputRange: [0, tabHalf] }) }] }]}
            />
          )}
          {(['all', 'network'] as ScopeKey[]).map((s) => {
            const on = scope === s;
            return (
              <Pressable key={s} onPress={() => setScope(s)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={styles.tab}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(s === 'all' ? 'feed:scope.all' : 'feed:scope.network')}</Text>
              </Pressable>
            );
          })}
        </View>

        {posts.length === 0 ? (
          <Text style={styles.empty}>
            {scope === 'network'
              ? t('feed:newsfeed.emptyNetwork')
              : t('feed:newsfeed.emptyAll')}
          </Text>
        ) : (
          <View style={styles.list}>
            {posts.map((p, i) => (
              <FeedItem key={p.id} index={i}>
                <PostCard post={p} onOpen={(postId) => navigation.navigate('PostDetail', { postId })} />
              </FeedItem>
            ))}
          </View>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

/** Fades + lifts a post into place on first mount (staggered; snaps when reduced). */
function FeedItem({ index, children }: { index: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.timing(v, {
      toValue: 1,
      duration: durations.slow,
      delay: Math.min(index, 8) * 55,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: INK },
  peopleBtn: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#ECEAE4' },
  peopleText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  bellBtn: { backgroundColor: CARD, borderRadius: 999, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECEAE4' },
  bellIcon: { fontSize: 18 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 999, backgroundColor: '#C0202C', alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  meBtn: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: '#ECEAE4', overflow: 'hidden' },
  searchPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#ECEAE4', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchIcon: { fontSize: 16 },
  searchText: { ...typography.body, color: MUTED, flex: 1 },

  composer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#ECEAE4' },
  composerHint: { ...typography.body, color: MUTED, flex: 1 },
  composerIcon: { fontSize: 18 },

  tabs: { flexDirection: 'row', backgroundColor: '#ECEAE4', borderRadius: 999, padding: 4 },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, backgroundColor: CARD, borderRadius: 999 },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: 999, alignItems: 'center' },
  tabText: { ...typography.label, color: MUTED, fontWeight: '700' },
  tabTextOn: { color: VIOLET },

  list: { gap: spacing.md },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingVertical: spacing.xl },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  lockEmoji: { fontSize: 44 },
  lockTitle: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center' },
  lockBody: { ...typography.body, color: MUTED, textAlign: 'center' },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.sm },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
