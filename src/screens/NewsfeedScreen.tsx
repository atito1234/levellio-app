import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeroAvatar, PostCard, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
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
  const { t } = useTranslation(['feed', 'common']);
  const allowed = useCommunityAccess();
  const { signedIn, subscribeFeed } = useCommunity();
  const { character } = useGame();
  const [scope, setScope] = useState<ScopeKey>('all');
  const [posts, setPosts] = useState<Post[]>([]);

  const feedScope: FeedScope = scope;
  useEffect(() => {
    if (!signedIn || !allowed) return;
    const unsub = subscribeFeed(feedScope, setPosts);
    return unsub;
  }, [signedIn, allowed, feedScope, subscribeFeed]);

  const header = useMemo(
    () => (
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('feed:newsfeed.title')}</Text>
        <Pressable onPress={() => navigation.navigate('People')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.peopleA11y')} style={styles.peopleBtn}>
          <Text style={styles.peopleText}>{t('feed:newsfeed.people')}</Text>
        </Pressable>
      </View>
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {header}

        {/* Facebook-style composer — one tap to share. */}
        <Pressable onPress={() => navigation.navigate('PostComposer')} accessibilityRole="button" accessibilityLabel={t('feed:newsfeed.composerA11y')} style={styles.composer}>
          <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={40} />
          <Text style={styles.composerHint}>{t('feed:newsfeed.composerHint')}</Text>
          <Text style={styles.composerIcon}>✏️</Text>
        </Pressable>

        {/* Scope tabs. */}
        <View style={styles.tabs}>
          {(['all', 'network'] as ScopeKey[]).map((s) => {
            const on = scope === s;
            return (
              <Pressable key={s} onPress={() => setScope(s)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
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
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onOpen={(postId) => navigation.navigate('PostDetail', { postId })} />
            ))}
          </View>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.heading, color: INK },
  peopleBtn: { backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#ECEAE4' },
  peopleText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  composer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: '#ECEAE4' },
  composerHint: { ...typography.body, color: MUTED, flex: 1 },
  composerIcon: { fontSize: 18 },

  tabs: { flexDirection: 'row', backgroundColor: '#ECEAE4', borderRadius: 999, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: CARD },
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
