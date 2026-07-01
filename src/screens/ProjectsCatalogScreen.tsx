import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppHeader, CommunityGate, ScreenContainer, SectionLabel } from '@/components';
import { useRoomTour } from '@/components/spotlight';
import { INVITE_ONLY } from '@/config/features';
import { radii, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useProjects } from '@/state/ProjectsContext';
import { useCommunity } from '@/state/CommunityContext';
import { useSettings } from '@/state/SettingsContext';
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
  useRoomTour('projects');
  const { account } = useAuth();
  const { signedIn, isShared, featured, myProjects, refresh } = useProjects();
  const { myApplication } = useCommunity();
  const { settings } = useSettings();
  const entitlements = useEntitlements();

  // Projects recommended from the onboarding questionnaire (not already joined).
  const recommendedIds = settings.recommendedProjectIds ?? [];
  const recommended = featured.filter(
    (p) => recommendedIds.includes(p.id) && !myProjects.some((m) => m.id === p.id),
  );

  const ownedCount = account?.uid ? myProjects.filter((p) => p.ownerUid === account.uid).length : 0;
  const canCreate = canUseProjectsUnlimited(entitlements) || ownedCount < FREE_OWNED_PROJECT_CAP;
  // Creating a project is vetted: apply → owner approves → then you can create.
  const onCreate = () => {
    if (myApplication?.status === 'approved') {
      canCreate ? navigation.navigate('ProjectEditor') : navigation.navigate('Paywall');
    } else if (myApplication?.status === 'pending') {
      Alert.alert(t('application.pendingTitle'), t('application.pendingBody'));
    } else {
      navigation.navigate('ProjectApplication');
    }
  };

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!signedIn) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <CommunityGate
          onPrimary={() => navigation.navigate('SignIn')}
          onSecondary={() => navigation.navigate('JoinProject', {})}
        />
      </ScreenContainer>
    );
  }

  // Invite-only founding beta: unlock with a founding code first.
  if (INVITE_ONLY && !settings.foundingInviteCodeAccepted) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <CommunityGate
          title={t('feed:inviteGate.title')}
          body={t('feed:inviteGate.body')}
          ctaLabel={t('feed:inviteGate.cta')}
          onPrimary={() => navigation.navigate('FoundingGate')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
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
            <SectionLabel>{t('myProjects')}</SectionLabel>
            {myProjects.map((p) => (
              <ProjectCard key={p.id} project={p} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })} joined />
            ))}
          </>
        )}

        {recommended.length > 0 && (
          <>
            <SectionLabel>{t('recommended')}</SectionLabel>
            {recommended.map((p) => (
              <ProjectCard key={p.id} project={p} onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })} />
            ))}
          </>
        )}

        <SectionLabel>{t('featured')}</SectionLabel>
        {featured.length === 0 && <Text style={styles.empty}>{t('noFeatured')}</Text>}
        {featured
          .filter((p) => !myProjects.some((m) => m.id === p.id) && !recommendedIds.includes(p.id))
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
      style={[styles.card, { borderColor: `${c.accent}33` }]}
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
  empty: { ...typography.body, color: MUTED },

  card: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, ...shadows.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiBadge: { width: 56, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  cardTitle: { ...typography.title, color: INK, fontWeight: '800' },
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
