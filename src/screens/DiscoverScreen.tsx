import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FollowButton, HeroAvatar, ProjectBadge, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { useProjects } from '@/state/ProjectsContext';
import { HABIT_LIBRARY } from '@/data/habitLibrary';
import { CATEGORY_META } from '@/lib/categories';
import { searchHabits, searchPeople, searchProjects } from '@/lib/discovery';
import type { Post } from '@/lib/community';
import type { HeroPresentation } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Discover'>;
type Tab = 'people' | 'habits' | 'projects';
interface Person {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
}

const TABS: Tab[] = ['people', 'habits', 'projects'];

export function DiscoverScreen({ navigation }: Props) {
  const { t } = useTranslation(['discover', 'common']);
  const { uid, subscribeFeed } = useCommunity();
  const { featured, myProjects } = useProjects();
  const [tab, setTab] = useState<Tab>('people');
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const unsub = subscribeFeed('all', setPosts);
    return unsub;
  }, [subscribeFeed]);

  const people = useMemo<Person[]>(() => {
    const map = new Map<string, Person>();
    for (const p of posts) {
      if (p.authorUid && p.authorUid !== uid && !map.has(p.authorUid)) {
        map.set(p.authorUid, { uid: p.authorUid, displayName: p.displayName, presentation: p.presentation });
      }
    }
    return [...map.values()];
  }, [posts, uid]);

  const projects = useMemo(() => {
    const map = new Map(featured.map((p) => [p.id, p]));
    for (const p of myProjects) map.set(p.id, p);
    return [...map.values()];
  }, [featured, myProjects]);

  const peopleResults = useMemo(() => searchPeople(people, query), [people, query]);
  const habitResults = useMemo(() => searchHabits(HABIT_LIBRARY, query), [query]);
  const projectResults = useMemo(() => searchProjects(projects, query), [projects, query]);

  return (
    <ScreenContainer backgroundColor={colors.background} keyboardAvoiding>
      <Text style={styles.title}>{t('discover:title')}</Text>

      <View style={styles.searchPill}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('discover:searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <View style={styles.tabs}>
        {TABS.map((tb) => {
          const on = tab === tb;
          return (
            <Pressable key={tb} onPress={() => setTab(tb)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(`discover:tabs.${tb}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {tab === 'people' &&
          (peopleResults.length === 0 ? (
            <Text style={styles.empty}>{t('discover:empty.people')}</Text>
          ) : (
            peopleResults.map((person) => (
              <View key={person.uid} style={styles.row}>
                <Pressable onPress={() => navigation.navigate('Profile', { uid: person.uid })} accessibilityRole="button" style={styles.rowTap}>
                  <HeroAvatar presentation={person.presentation ?? 'neutral'} tier="novice" size={40} />
                  <Text style={styles.name} numberOfLines={1}>{person.displayName}</Text>
                </Pressable>
                <FollowButton targetUid={person.uid} size="md" />
              </View>
            ))
          ))}

        {tab === 'habits' &&
          (habitResults.length === 0 ? (
            <Text style={styles.empty}>{t('discover:empty.habits')}</Text>
          ) : (
            habitResults.map((h) => (
              <View key={h.id} style={styles.row}>
                <Text style={styles.habitIcon}>{CATEGORY_META[h.category].icon}</Text>
                <View style={styles.habitText}>
                  <Text style={styles.name} numberOfLines={1}>{h.title}</Text>
                  {h.description ? <Text style={styles.sub} numberOfLines={1}>{h.description}</Text> : null}
                </View>
                <Pressable
                  onPress={() => navigation.navigate('QuestEditor', { prefill: { title: h.title, category: h.category, difficulty: h.difficulty } })}
                  accessibilityRole="button"
                  style={styles.addBtn}
                >
                  <Text style={styles.addBtnText}>{t('discover:addHabit')}</Text>
                </Pressable>
              </View>
            ))
          ))}

        {tab === 'projects' &&
          (projectResults.length === 0 ? (
            <Text style={styles.empty}>{t('discover:empty.projects')}</Text>
          ) : (
            projectResults.map((p) => (
              <Pressable key={p.id} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })} accessibilityRole="button" style={styles.projectRow}>
                <ProjectBadge projects={[p]} />
                <Text style={styles.sub} numberOfLines={2}>{p.summary}</Text>
              </Pressable>
            ))
          ))}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.textPrimary, paddingVertical: spacing.md },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { ...typography.body, color: colors.textPrimary, flex: 1, paddingVertical: 2 },
  tabs: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radii.pill, padding: 4, gap: 4, marginTop: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.pill, alignItems: 'center' },
  tabOn: { backgroundColor: colors.surface },
  tabText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
  tabTextOn: { color: colors.identity },
  scroll: { gap: spacing.sm, paddingTop: spacing.md },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
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
  rowTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.label, color: colors.textPrimary, fontWeight: '700', flex: 1 },
  sub: { ...typography.caption, color: colors.textSecondary },
  habitIcon: { fontSize: 22 },
  habitText: { flex: 1 },
  addBtn: { backgroundColor: colors.violetSoft, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  addBtnText: { ...typography.label, color: colors.violetDeep, fontWeight: '800' },
  projectRow: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
});
