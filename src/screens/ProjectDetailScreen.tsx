import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ProgressBar } from '@/components';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import {
  cycleEndLabel,
  projectColor,
  type Contribution,
  type ProjectMember,
  type ProjectSuggestedHabit,
} from '@/lib/projects';
import type { ProjectSnapshot } from '@/services/projects';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ProjectDetailScreen({ route, navigation }: Props) {
  const { projectId } = route.params;
  const { account } = useAuth();
  const { quests, addQuest } = useGame();
  const { subscribe, joinProject, leaveProject, setShareFeed, linkedProjectIds, linkHabit } = useProjects();

  const [snap, setSnap] = useState<ProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinShare, setJoinShare] = useState(true);

  useEffect(() => {
    const unsub = subscribe(projectId, (s) => {
      setSnap(s);
      setLoading(false);
    });
    return unsub;
  }, [projectId, subscribe]);

  const uid = account?.uid;
  const me = useMemo<ProjectMember | undefined>(
    () => snap?.members.find((m) => m.uid === uid),
    [snap, uid],
  );
  const joined = Boolean(me);

  const project = snap?.project;
  const c = project ? projectColor(project) : { accent: VIOLET, soft: '#EDE9FE', id: 'violet' as const };
  const pct = snap?.cycle.pct ?? 0;
  const barColor = pct >= 100 ? GOLD : c.accent;
  const activeToday = useMemo(() => {
    const today = dayKey(new Date());
    return new Set((snap?.feed ?? []).filter((f) => dayKey(new Date(f.createdAt)) === today).map((f) => f.uid)).size;
  }, [snap]);

  const adopt = async (habit: ProjectSuggestedHabit) => {
    const quest = await addQuest({ title: habit.title, category: habit.category, difficulty: 'easy' });
    if (quest) {
      await linkHabit(quest.id, projectId);
      Alert.alert("You're in 🤝", `“${habit.title}” is now one of your habits — every time you complete it, you move this project forward.`);
    }
  };

  const myLinkedTitles = useMemo(() => {
    return quests.filter((q) => linkedProjectIds(q.id).includes(projectId)).map((q) => q.title);
  }, [quests, linkedProjectIds, projectId]);

  const invite = async () => {
    if (!project) return;
    await Share.share({
      message: `Join me on Levellio for “${project.title}”. Use invite code ${project.inviteCode} or open levellio://join/${project.inviteCode}`,
    });
  };

  const confirmLeave = () => {
    Alert.alert('Leave project?', 'Your habits stay — they just stop contributing here.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveProject(projectId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <Topbar onBack={() => navigation.goBack()} title="Project" onInvite={undefined} />
        <Text style={styles.loading}>Loading…</Text>
      </ScreenContainer>
    );
  }

  if (!project) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <Topbar onBack={() => navigation.goBack()} title="Project" onInvite={undefined} />
        <Text style={styles.loading}>This project is no longer available.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={BG}>
      <Topbar onBack={() => navigation.goBack()} title="Project" onInvite={joined ? invite : undefined} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: c.soft }]}>
          <Text style={styles.heroEmoji}>{project.emoji}</Text>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {project.title}
          </Text>
          <Text style={styles.heroMeta}>
            {project.region || 'Community'} · {project.memberCount} {project.memberCount === 1 ? 'member' : 'members'}
          </Text>
          <Text style={styles.heroSummary}>{project.summary}</Text>
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <View style={styles.progressTop}>
            <Text style={styles.progressPct}>{pct}%</Text>
            <Text style={styles.progressCycle}>{cycleEndLabel()}</Text>
          </View>
          <ProgressBar progress={pct / 100} color={barColor} trackColor={TRACK} height={14} label="Project weekly progress" />
          <Text style={styles.progressCount}>
            {snap?.cycle.count ?? 0} / {project.weeklyGoal} {project.unit} this week
          </Text>
          {activeToday > 0 && (
            <Text style={[styles.pulse, { color: c.accent }]}>👥 {activeToday} active today</Text>
          )}
          {project.reward.length > 0 && (
            <Text style={styles.reward}>🎁 Reward at 100%: {project.reward}</Text>
          )}
        </View>

        {/* Join / membership */}
        {!joined ? (
          <View style={styles.card}>
            <View style={styles.consentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.consentTitle}>Share my activity</Text>
                <Text style={styles.consentBody}>
                  Let members see the habits you complete here. Your contributions count either way.
                </Text>
              </View>
              <Switch value={joinShare} onValueChange={setJoinShare} accessibilityLabel="Share my activity" />
            </View>
            <Pressable
              onPress={() => void joinProject(projectId, joinShare)}
              accessibilityRole="button"
              accessibilityLabel="Join this project"
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Join this project</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.consentRow}>
              <Text style={styles.consentTitle}>Share my activity</Text>
              <Switch
                value={me?.shareFeed ?? true}
                onValueChange={(v) => void setShareFeed(projectId, v)}
                accessibilityLabel="Share my activity"
              />
            </View>
            {myLinkedTitles.length > 0 && (
              <Text style={styles.linkedNote}>
                Contributing: {myLinkedTitles.join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Suggested habits */}
        {project.suggestedHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>SUGGESTED HABITS</Text>
            {project.suggestedHabits.map((h, i) => {
              const already = quests.some((q) => q.title.trim().toLowerCase() === h.title.trim().toLowerCase());
              return (
                <View key={`${h.title}-${i}`} style={styles.habitRow}>
                  <Text style={styles.habitText} numberOfLines={2}>
                    {CATEGORY_META[h.category].icon} {h.title}{' '}
                    <Text style={styles.habitVal}>+{h.contribution} {project.unit}</Text>
                  </Text>
                  <Pressable
                    onPress={() => void adopt(h)}
                    disabled={already}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${h.title}`}
                    style={[styles.adoptBtn, already && styles.adoptOff]}
                  >
                    <Text style={styles.adoptText}>{already ? 'Added' : '+ Add'}</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {/* Post to the community feed, scoped to this project. */}
        {joined && (
          <Pressable
            onPress={() => navigation.navigate('PostComposer', { projectId })}
            accessibilityRole="button"
            accessibilityLabel="Post an update to this project"
            style={styles.postUpdate}
          >
            <Text style={styles.postUpdateText}>💬 Post an update to your community</Text>
          </Pressable>
        )}

        {/* Activity feed */}
        <Text style={styles.sectionLabel}>LIVE ACTIVITY</Text>
        {(snap?.feed.length ?? 0) === 0 ? (
          <Text style={styles.empty}>No activity yet. Be the first to contribute!</Text>
        ) : (
          snap!.feed.map((f: Contribution) => (
            <View key={f.id} style={styles.feedRow}>
              <View style={[styles.feedDot, { backgroundColor: c.accent }]} />
              <Text style={styles.feedText} numberOfLines={2}>
                <Text style={styles.feedName}>{f.displayName}</Text> {f.habitTitle} · +{f.value}
                {f.mode === 'onsite' ? ' · 📍 on-site' : ''}
              </Text>
              <Text style={styles.feedTime}>{timeAgo(f.createdAt)}</Text>
            </View>
          ))
        )}

        {/* Members */}
        <Text style={styles.sectionLabel}>MEMBERS ({snap?.members.length ?? 0})</Text>
        {snap?.members.map((m) => (
          <View key={m.uid} style={styles.memberRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {m.displayName}
              {m.role === 'owner' ? ' · owner' : ''}
              {m.uid === uid ? ' · you' : ''}
            </Text>
            <Text style={styles.memberTotal}>{m.contributionTotal}</Text>
          </View>
        ))}

        {joined && (
          <Pressable onPress={confirmLeave} accessibilityRole="button" accessibilityLabel="Leave project" style={styles.leave}>
            <Text style={styles.leaveText}>Leave project</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Topbar({ onBack, title, onInvite }: { onBack: () => void; title: string; onInvite?: () => void }) {
  return (
    <View style={styles.topbar}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
        <Text style={styles.chevron}>‹</Text>
      </Pressable>
      <Text style={styles.topTitle} accessibilityRole="header">
        {title}
      </Text>
      {onInvite ? (
        <Pressable onPress={onInvite} accessibilityRole="button" accessibilityLabel="Invite" hitSlop={12}>
          <Text style={styles.invite}>Invite</Text>
        </Pressable>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  topTitle: { ...typography.heading, color: INK },
  invite: { ...typography.label, color: VIOLET, fontWeight: '800', width: 44, textAlign: 'right' },
  loading: { ...typography.body, color: MUTED, paddingVertical: spacing.xl },

  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  hero: { borderRadius: 20, padding: spacing.lg, gap: 4, alignItems: 'center' },
  heroEmoji: { fontSize: 44 },
  heroTitle: { ...typography.heading, color: INK, textAlign: 'center' },
  heroMeta: { ...typography.caption, color: MUTED },
  heroSummary: { ...typography.body, color: INK, textAlign: 'center', marginTop: spacing.xs },

  card: { backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressPct: { ...typography.heading, color: INK, fontWeight: '900' },
  progressCycle: { ...typography.caption, color: MUTED },
  progressCount: { ...typography.label, color: INK, fontWeight: '700' },
  pulse: { ...typography.caption, fontWeight: '800' },
  reward: { ...typography.caption, color: MUTED },

  consentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  consentTitle: { ...typography.label, color: INK, fontWeight: '700' },
  consentBody: { ...typography.caption, color: MUTED, marginTop: 2 },
  linkedNote: { ...typography.caption, color: MUTED },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  postUpdate: { backgroundColor: '#EDE9FE', borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  postUpdateText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, marginTop: spacing.md },
  empty: { ...typography.body, color: MUTED },

  habitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  habitText: { ...typography.label, color: INK, flex: 1 },
  habitVal: { color: MUTED, fontWeight: '700' },
  adoptBtn: { backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  adoptOff: { opacity: 0.5 },
  adoptText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  feedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  feedDot: { width: 8, height: 8, borderRadius: 4 },
  feedText: { ...typography.caption, color: INK, flex: 1 },
  feedName: { fontWeight: '800' },
  feedTime: { ...typography.caption, color: MUTED },

  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  memberName: { ...typography.label, color: INK, flex: 1 },
  memberTotal: { ...typography.label, color: VIOLET, fontWeight: '800' },

  leave: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  leaveText: { ...typography.label, color: '#C0202C', fontWeight: '700' },
});
