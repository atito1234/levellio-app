import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader, CommunityGate, HeroAvatar, PostCard, PressableScale, ScreenContainer, StoriesRail, UgcConsentGate, useUgcConsent } from '@/components';
import { useRoomTour } from '@/components/spotlight';
import { spacing, typography } from '@/theme';
import { durations, springs } from '@/theme/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCommunity } from '@/state/CommunityContext';
import { useGame } from '@/state/GameContext';
import { useCommunityAccess } from '@/services/community/access';
import { type FeedScope, type Post } from '@/lib/community';
import { CATEGORY_COLOR, CATEGORY_META, CATEGORY_ORDER } from '@/lib/categories';
import type { QuestCategory } from '@/types';
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
  useRoomTour('feed');
  const allowed = useCommunityAccess();
  const { consented } = useUgcConsent();
  const { signedIn, subscribeFeed } = useCommunity();
  const { character } = useGame();
  const reduced = useReducedMotion();
  const [scope, setScope] = useState<ScopeKey>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Life-area filter (null = all). Posts carry an optional `category`.
  const [cat, setCat] = useState<QuestCategory | null>(null);
  const shown = useMemo(() => (cat ? posts.filter((p) => p.category === cat) : posts), [posts, cat]);

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

  // Shared chrome (avatar → profile, notifications, inbox) for cross-tab
  // consistency, plus the Feed's own title + People affordance below it.
  const header = useMemo(
    () => (
      <>
        <AppHeader />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('feed:newsfeed.title')}</Text>
          <PressableScale onPress={() => navigation.navigate('People')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.peopleA11y')} style={styles.peopleBtn}>
            <Text style={styles.peopleText}>{t('feed:newsfeed.people')}</Text>
          </PressableScale>
        </View>
      </>
    ),
    [navigation, t],
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
        <CommunityGate onPrimary={() => navigation.navigate('SignIn')} />
      </ScreenContainer>
    );
  }

  // Must accept community rules + confirm age before entering (Apple 1.2 / Google UGC).
  if (!consented) {
    return (
      <ScreenContainer backgroundColor={BG}>
        {header}
        <UgcConsentGate />
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

        {/* Life-area filter chips — color-coded; tap to focus one category. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            onPress={() => setCat(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: !cat }}
            style={[styles.filterChip, !cat && styles.filterChipOn]}
          >
            <Text style={[styles.filterText, !cat && styles.filterTextOn]}>{t('feed:filterAll')}</Text>
          </Pressable>
          {CATEGORY_ORDER.map((c) => {
            const on = cat === c;
            const color = CATEGORY_COLOR[c];
            return (
              <Pressable
                key={c}
                onPress={() => setCat(on ? null : c)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('categories:' + c)}
                style={[styles.filterChip, on && { backgroundColor: `${color}1A`, borderColor: color }]}
              >
                <View style={[styles.filterDot, { backgroundColor: color }]} />
                <Text style={[styles.filterText, on && { color, fontWeight: '800' }]}>{CATEGORY_META[c].icon} {t('categories:' + c)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {shown.length === 0 ? (
          <Text style={styles.empty}>
            {cat
              ? t('feed:emptyCategory')
              : scope === 'network'
                ? t('feed:newsfeed.emptyNetwork')
                : t('feed:newsfeed.emptyAll')}
          </Text>
        ) : (
          <View style={styles.list}>
            {shown.map((p, i) => (
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
  title: { ...typography.heading, color: INK },
  peopleBtn: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#ECEAE4' },
  peopleText: { ...typography.label, color: VIOLET, fontWeight: '800' },
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

  filterRow: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.md },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#ECEAE4' },
  filterChipOn: { backgroundColor: '#EDE9FE', borderColor: VIOLET },
  filterDot: { width: 9, height: 9, borderRadius: 999 },
  filterText: { ...typography.caption, color: MUTED, fontWeight: '700' },
  filterTextOn: { color: VIOLET, fontWeight: '800' },

  list: { gap: spacing.md },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingVertical: spacing.xl },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  lockEmoji: { fontSize: 44 },
  lockTitle: { ...typography.title, color: INK, fontWeight: '800', textAlign: 'center' },
  lockBody: { ...typography.body, color: MUTED, textAlign: 'center' },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.sm },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
