import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityTile, AddActivitySheet, OwnedActivityCard, ProgressBar, ScreenContainer, SuggestedActivityCard } from '@/components';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { useGoals } from '@/state/GoalContext';
import { usePlan } from '@/state/PlanContext';
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
  const { subscribe, joinProject, leaveProject, setShareFeed, linkedProjectIds, linkHabit, unlinkHabit } = useProjects();
  const { goals, goalsForHabit, linkGoal, unlinkGoal, addGoal } = useGoals();
  const { getPlan, togglePlanned } = usePlan();

  const [snap, setSnap] = useState<ProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinShare, setJoinShare] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

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

  const questByTitle = (title: string) => quests.find((q) => q.title.trim().toLowerCase() === title.trim().toLowerCase());
  const todayK = dayKey(new Date());

  /**
   * Make a project habit truly the user's: reuse-or-create it as a DAILY habit,
   * link it to the project, and put it on today's plan so it shows on the home,
   * the calendar, and analytics straight away.
   */
  const ensureOwned = async (habit: { title: string; category: ProjectSuggestedHabit['category'] }): Promise<string | null> => {
    const existing = questByTitle(habit.title);
    const id = existing?.id ?? (await addQuest({ title: habit.title, category: habit.category, difficulty: 'easy', scheduledDays: [0, 1, 2, 3, 4, 5, 6] }))?.id;
    if (!id) return null;
    await linkHabit(id, projectId);
    if (!(getPlan(todayK) ?? []).includes(id)) await togglePlanned(todayK, id);
    return id;
  };

  const adopt = async (habit: ProjectSuggestedHabit) => {
    const id = await ensureOwned(habit);
    if (id) Alert.alert("You're in 🤝", `“${habit.title}” is now a daily habit of yours — it shows on your Today and powers this project every time you do it.`);
  };

  // The user's OWN activities that power this project — theirs to add, edit,
  // remove, tag into goals, and take into battle.
  const myQuests = useMemo(
    () => quests.filter((q) => linkedProjectIds(q.id).includes(projectId)),
    [quests, linkedProjectIds, projectId],
  );

  const addAllSuggested = async () => {
    if (!project) return;
    for (const h of project.suggestedHabits) await ensureOwned(h);
    Alert.alert("They're yours 🤝", 'All suggested habits are now daily habits in your activities, powering this project.');
  };

  /** Turn this project into one of the user's goals and file its activities in it. */
  const makeProjectAGoal = async () => {
    if (!project) return;
    const cats = [...new Set(project.suggestedHabits.map((h) => h.category))];
    const goal = await addGoal({
      title: project.title,
      emoji: project.emoji,
      colorId: project.colorId,
      categories: cats.length ? cats : ['health'],
    });
    if (goal) {
      for (const q of myQuests) await linkGoal(q.id, goal.id);
      Alert.alert('Goal created 🎯', `“${project.title}” is now a goal — your activities here ladder up to it.`);
    }
  };

  const toggleGoalFor = (activityId: string, goalId: string) => {
    if (goalsForHabit(activityId).includes(goalId)) void unlinkGoal(activityId, goalId);
    else void linkGoal(activityId, goalId);
  };

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
          </View>
        )}

        {/* Big, fun activity tiles: add your own, or ask peers who've solved it. */}
        {joined && (
          <View style={styles.tileRow}>
            <ActivityTile icon="✨" label="New activity" sub="Add your own daily habit" onPress={() => setAddOpen(true)} tint={c.accent} />
            <ActivityTile icon="🌍" label="Ask peers" sub="Get a habit that worked for them" onPress={() => navigation.navigate('PostComposer', { projectId, kind: 'ask' })} tint={VIOLET} />
          </View>
        )}

        {/* YOUR activities — beautiful cards: Do / Battle / Edit / Remove + goals. */}
        {joined && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>YOUR ACTIVITIES HERE</Text>
              {myQuests.length > 1 && (
                <Pressable
                  onPress={() => navigation.navigate('BattleSetup', { questIds: myQuests.map((q) => q.id) })}
                  accessibilityRole="button"
                  accessibilityLabel="Take these activities into battle"
                  hitSlop={8}
                >
                  <Text style={styles.slay}>⚔️ Slay these</Text>
                </Pressable>
              )}
            </View>
            {myQuests.length === 0 ? (
              <Text style={styles.empty}>Add a suggested activity below — or your own — to make it yours.</Text>
            ) : (
              <View style={styles.cardList}>
                {myQuests.map((q) => (
                  <OwnedActivityCard
                    key={q.id}
                    emoji={CATEGORY_META[q.category].icon}
                    title={q.title}
                    accent={c.accent}
                    goals={goals}
                    inGoalIds={new Set(goalsForHabit(q.id))}
                    onToggleGoal={(goalId) => toggleGoalFor(q.id, goalId)}
                    onNewGoal={() => navigation.navigate('GoalEditor')}
                    onDo={() => navigation.navigate('Ripple', { questId: q.id })}
                    onBattle={() => navigation.navigate('BattleSetup', { questId: q.id })}
                    onEdit={() => navigation.navigate('QuestEditor', { questId: q.id })}
                    onRemove={() => void unlinkHabit(q.id, projectId)}
                  />
                ))}
              </View>
            )}
            <Pressable onPress={() => void makeProjectAGoal()} accessibilityRole="button" accessibilityLabel="Make this project one of your goals" style={styles.makeGoal}>
              <Text style={styles.makeGoalText}>🎯 Make this project a goal</Text>
            </Pressable>
          </>
        )}

        {/* Suggested activities — big adopt cards (daily habit, reuse by name). */}
        {project.suggestedHabits.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>SUGGESTED ACTIVITIES</Text>
              <Pressable onPress={() => void addAllSuggested()} accessibilityRole="button" accessibilityLabel="Add all suggested activities" hitSlop={8}>
                <Text style={styles.slay}>＋ Add all</Text>
              </Pressable>
            </View>
            <View style={styles.cardList}>
              {project.suggestedHabits.map((h, i) => {
                const owned = questByTitle(h.title);
                const linked = owned ? linkedProjectIds(owned.id).includes(projectId) : false;
                return (
                  <SuggestedActivityCard
                    key={`${h.title}-${i}`}
                    emoji={CATEGORY_META[h.category].icon}
                    title={h.title}
                    contribution={`+${h.contribution} ${project.unit}`}
                    accent={c.accent}
                    added={linked}
                    onAdd={() => void adopt(h)}
                    onEdit={() => owned && navigation.navigate('QuestEditor', { questId: owned.id })}
                  />
                );
              })}
            </View>
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

      {/* Add your own activity, pre-linked to this project as a daily habit. */}
      <AddActivitySheet visible={addOpen} onClose={() => setAddOpen(false)} defaultProjectIds={[projectId]} />
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  slay: { ...typography.label, color: VIOLET, fontWeight: '800' },
  empty: { ...typography.body, color: MUTED },
  tileRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cardList: { gap: spacing.sm },
  makeGoal: { alignSelf: 'flex-start', backgroundColor: '#F4F1FE', borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.xs },
  makeGoalText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  habitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  habitText: { ...typography.label, color: INK, flex: 1 },
  habitVal: { color: MUTED, fontWeight: '700' },
  adoptBtn: { backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
  adoptOff: { opacity: 0.5 },
  adoptDone: { backgroundColor: '#EAFBF6' },
  adoptText: { ...typography.label, color: VIOLET, fontWeight: '800' },
  adoptDoneText: { color: '#0A6E5C' },
  ownIcon: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  ownIconText: { fontSize: 16 },
  ownEdit: { ...typography.label, color: VIOLET, fontWeight: '800' },
  ownRemove: { ...typography.label, color: '#C0202C', fontWeight: '800', fontSize: 16 },

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
