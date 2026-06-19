import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FollowButton, HeroAvatar, ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import type { HeroPresentation } from '@/types';
import type { Post } from '@/lib/community';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'People'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const MUTED = '#5A5A72';

interface Person {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
}

/** Discover & manage your network — follow the people sharing in the community. */
export function PeopleScreen({ navigation }: Props) {
  const { t } = useTranslation(['discover', 'common']);
  const { uid, following, subscribeFeed } = useCommunity();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const unsub = subscribeFeed('all', setPosts);
    return unsub;
  }, [subscribeFeed]);

  // Distinct authors seen in the feed = people you can follow.
  const people = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();
    for (const p of posts) {
      if (p.authorUid && p.authorUid !== uid && !map.has(p.authorUid)) {
        map.set(p.authorUid, { uid: p.authorUid, displayName: p.displayName, presentation: p.presentation });
      }
    }
    return [...map.values()];
  }, [posts, uid]);

  const followingPeople = people.filter((p) => following.has(p.uid));
  const suggestions = people.filter((p) => !following.has(p.uid));

  const row = (person: Person) => (
    <View key={person.uid} style={styles.row}>
      <Pressable onPress={() => navigation.navigate('Profile', { uid: person.uid })} accessibilityRole="button" style={styles.rowTap}>
        <HeroAvatar presentation={person.presentation ?? 'neutral'} tier="novice" size={40} />
        <Text style={styles.name} numberOfLines={1}>{person.displayName}</Text>
      </Pressable>
      <FollowButton targetUid={person.uid} size="md" />
    </View>
  );

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('common:action.back')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('discover:people.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {people.length === 0 ? (
          <Text style={styles.empty}>{t('discover:people.empty')}</Text>
        ) : (
          <>
            {followingPeople.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('discover:people.following')} ({followingPeople.length})</Text>
                {followingPeople.map(row)}
              </>
            )}
            {suggestions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('discover:people.suggested')}</Text>
                {suggestions.map(row)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.title, color: INK, fontWeight: '800' },
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 16, padding: spacing.md },
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...typography.body, color: INK, fontWeight: '700', flex: 1 },
  empty: { ...typography.body, color: MUTED, textAlign: 'center', paddingVertical: spacing.xl },
});
