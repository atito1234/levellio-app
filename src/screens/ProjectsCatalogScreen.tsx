import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useProjects } from '@/state/ProjectsContext';
import { useEntitlements } from '@/state/SubscriptionContext';
import { canUseProjectsUnlimited } from '@/services/monetization';
import { projectColor, type Project } from '@/lib/projects';
import { localizeProject } from '@/lib/projectText';
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
  const { t } = useTranslation('projects');
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
            {t('gate.title')}
          </Text>
          <Text style={styles.gateLead}>{t('gate.lead')}</Text>
          <Pressable
            onPress={() => navigation.navigate('SignIn')}
            accessibilityRole="button"
            accessibilityLabel={t('gate.signIn')}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{t('gate.signIn')}</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('JoinProject', {})}
            accessibilityRole="button"
            style={styles.ghost}
          >
            <Text style={styles.ghostText}>{t('gate.haveCode')}</Text>
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
              {t('title')}
            </Text>
            <Text style={styles.subtitle}>
              {account?.displayName ? t('greeting', { name: account.displayName }) : t('tagline')}
              {!isShared ? ` · ${t('offline')}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onCreate} accessibilityRole="button" style={styles.actionBtn}>
            <Text style={styles.actionText}>{canCreate ? t('create') : t('createPlus')}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('JoinProject', {})} accessibilityRole="button" style={[styles.actionBtn, styles.actionGhost]}>
            <Text style={[styles.actionText, { color: VIOLET }]}>{t('joinWithCode')}</Text>
          </Pressable>
        </View>

        {myProjects.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('myProjects')}</Text>
            {myProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })} joined />
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>{t('featured')}</Text>
        {featured.length === 0 && <Text style={styles.empty}>{t('noFeatured')}</Text>}
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
  const { t } = useTranslation('projects');
  const c = projectColor(project);
  const text = localizeProject(t, project);
  const members = t('memberCount', { count: project.memberCount });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${text.title}, ${members}`}
      style={[styles.card, { borderLeftColor: c.accent }]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.emojiBadge, { backgroundColor: c.soft }]}>
          <Text style={styles.emoji}>{project.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {text.title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {t('meta', { region: text.region || t('community'), members })}
          </Text>
        </View>
        {joined && (
          <View style={[styles.joinedPill, { backgroundColor: c.soft }]}>
            <Text style={[styles.joinedText, { color: c.accent }]}>{t('joined')}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardSummary} numberOfLines={2}>
        {text.summary}
      </Text>
      <Text style={styles.cardGoal}>
        {t('weeklyGoal', { goal: project.weeklyGoal, unit: text.unit })}
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
