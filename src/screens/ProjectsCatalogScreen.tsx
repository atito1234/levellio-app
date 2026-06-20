import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useProjects } from '@/state/ProjectsContext';
import { useEntitlements } from '@/state/SubscriptionContext';
import { canUseProjectsUnlimited } from '@/services/monetization';
import { projectColor, type Project } from '@/lib/projects';
import type { RootStackParamList } from '@/navigation/types';

/** Free members can create one project; Plus unlocks unlimited. Joining is always free. */
const FREE_OWNED_PROJECT_CAP = 1;

type Nav = NativeStackNavigationProp<RootStackParamList>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';

export function ProjectsCatalogScreen() {
  const navigation = useNavigation<Nav>();
  const { account } = useAuth();
  const { signedIn, isShared, featured, myProjects, refresh } = useProjects();
  const entitlements = useEntitlements();

  const ownedCount = account?.uid ? myProjects.filter((p) => p.ownerUid === account.uid).length : 0;
  const canCreate = canUseProjectsUnlimited(entitlements) || ownedCount < FREE_OWNED_PROJECT_CAP;
  const onCreate = () =>
    canCreate ? navigation.navigate('ProjectEditor') : navigation.navigate('Paywall');

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!signedIn) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <ScrollView contentContainerStyle={styles.gateContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.gateEmoji}>🤝</Text>
          <Text style={styles.gateTitle} accessibilityRole="header">
            Community Projects
          </Text>
          <Text style={styles.gateLead}>
            Join others working toward a shared, real-world goal — clean water, community gardens, malaria source
            reduction. Your everyday habits add up to collective change, and you can see what teammates are doing.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('SignIn')}
            accessibilityRole="button"
            accessibilityLabel="Sign in to join"
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Sign in to join</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('JoinProject', {})}
            accessibilityRole="button"
            style={styles.ghost}
          >
            <Text style={styles.ghostText}>I have an invite code</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title} accessibilityRole="header">
              Projects
            </Text>
            <Text style={styles.subtitle}>
              {account?.displayName ? `Hi, ${account.displayName}` : 'Build habits that add up'}
              {!isShared ? ' · offline mode' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onCreate} accessibilityRole="button" style={styles.actionBtn}>
            <Text style={styles.actionText}>{canCreate ? '+ Create' : '+ Create (Plus)'}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('JoinProject', {})} accessibilityRole="button" style={[styles.actionBtn, styles.actionGhost]}>
            <Text style={[styles.actionText, { color: VIOLET }]}>Join with code</Text>
          </Pressable>
        </View>

        {myProjects.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>MY PROJECTS</Text>
            {myProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })} joined />
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>FEATURED</Text>
        {featured.length === 0 && <Text style={styles.empty}>No featured projects yet.</Text>}
        {featured
          .filter((p) => !myProjects.some((m) => m.id === p.id))
          .map((p) => (
            <ProjectCard key={p.id} project={p} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })} />
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function ProjectCard({ project, onPress, joined }: { project: Project; onPress: () => void; joined?: boolean }) {
  const c = projectColor(project);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.title}, ${project.memberCount} members`}
      style={[styles.card, { borderLeftColor: c.accent }]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.emojiBadge, { backgroundColor: c.soft }]}>
          <Text style={styles.emoji}>{project.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {project.title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {project.region || 'Community'} · {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
        {joined && (
          <View style={[styles.joinedPill, { backgroundColor: c.soft }]}>
            <Text style={[styles.joinedText, { color: c.accent }]}>Joined</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardSummary} numberOfLines={2}>
        {project.summary}
      </Text>
      <Text style={styles.cardGoal}>
        Goal: {project.weeklyGoal} {project.unit} / week
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingVertical: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.heading, color: INK },
  subtitle: { ...typography.caption, color: MUTED, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs },
  actionBtn: { flex: 1, backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.sm, alignItems: 'center' },
  actionGhost: { backgroundColor: '#EDE9FE' },
  actionText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, marginTop: spacing.md },
  empty: { ...typography.body, color: MUTED },

  card: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.xs, borderLeftWidth: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emojiBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  cardTitle: { ...typography.body, color: INK, fontWeight: '800' },
  cardMeta: { ...typography.caption, color: MUTED, marginTop: 2 },
  joinedPill: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  joinedText: { ...typography.caption, fontWeight: '800' },
  cardSummary: { ...typography.caption, color: MUTED },
  cardGoal: { ...typography.caption, color: INK, fontWeight: '700' },

  gateContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  gateEmoji: { fontSize: 56 },
  gateTitle: { ...typography.heading, color: INK, textAlign: 'center' },
  gateLead: { ...typography.body, color: MUTED, textAlign: 'center' },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', alignSelf: 'stretch' },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  ghost: { paddingVertical: spacing.sm },
  ghostText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
