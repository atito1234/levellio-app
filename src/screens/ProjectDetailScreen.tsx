import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityTile, AddActivitySheet, MiniScheduler, OwnedActivityCard, ProgressBar, ScreenContainer, SuggestedActivityCard } from '@/components';
import { MoveToBucketSheet } from '@/components/MoveToBucketSheet';
import { spacing, typography } from '@/theme';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { useProjects } from '@/state/ProjectsContext';
import { useGoals } from '@/state/GoalContext';
import { useBuckets } from '@/state/BucketsContext';
import { usePlan } from '@/state/PlanContext';
import { useActivityLog } from '@/state/useActivityLog';
import { sessionDay, sessionsOf } from '@/lib/analytics';
import {
  daysLeftInCycle,
  projectColor,
  type Contribution,
  type ProjectMember,
  type ProjectSuggestedHabit,
} from '@/lib/projects';
import { localizeProject, localizeFeaturedHabit } from '@/lib/projectText';
import type { ProjectSnapshot } from '@/services/projects';
import { CATEGORY_META } from '@/lib/categories';
import { getBucketColor } from '@/lib/buckets';
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

function timeAgo(ts: number, t: TFunction): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return t('time.justNow');
  const m = Math.floor(s / 60);
  if (m < 60) return t('time.minutesAgo', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hoursAgo', { count: h });
  return t('time.daysAgo', { count: Math.floor(h / 24) });
}

/** Localized "X days left" / "resets tomorrow" for the current weekly cycle. */
function cycleLabel(t: TFunction): string {
  const left = daysLeftInCycle();
  return left <= 1 ? t('cycle.resetsTomorrow') : t('cycle.daysLeft', { count: left });
}

export function ProjectDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation('projects');
  const { projectId } = route.params;
  const { account } = useAuth();
  const { quests, addQuest } = useGame();
  const { subscribe, joinProject, leaveProject, setShareFeed, linkedProjectIds, linkHabit, unlinkHabit } = useProjects();
  const { goals, goalsForHabit, linkGoal, unlinkGoal } = useGoals();
  const { buckets, bucketIdFor, assignActivity } = useBuckets();
  const { getPlan, togglePlanned } = usePlan();
  const { events } = useActivityLog();

  const [snap, setSnap] = useState<ProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinShare, setJoinShare] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addDates, setAddDates] = useState<string[] | null>(null);
  // The activity whose group the user is picking (drives MoveToBucketSheet).
  const [groupTarget, setGroupTarget] = useState<{ id: string; title: string } | null>(null);

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
  // Activities already on today's plan show "✓ On today" instead of "Add to Today".
  const planned = useMemo(() => new Set(getPlan(todayK) ?? []), [getPlan, todayK]);

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
    if (id) Alert.alert(t('detail.adoptedTitle'), t('detail.adoptedBody', { title: habit.title }));
  };

  // The user's OWN activities that power this project — theirs to add, edit,
  // remove, tag into goals, and take into battle.
  const myQuests = useMemo(
    () => quests.filter((q) => linkedProjectIds(q.id).includes(projectId)),
    [quests, linkedProjectIds, projectId],
  );

  // The goal that mirrors THIS project (auto-created by ProjectsContext).
  const projectGoal = useMemo(
    () => goals.find((g) => g.kind === 'project' && g.projectId === projectId),
    [goals, projectId],
  );

  // Completions per day for this project's activities → the calendar heat.
  const myIdSet = useMemo(() => new Set(myQuests.map((q) => q.id)), [myQuests]);
  const doneByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sessionsOf(events)) {
      if (!myIdSet.has(s.activityId)) continue;
      const d = sessionDay(s);
      const set = map.get(d) ?? new Set<string>();
      set.add(s.activityId);
      if (!map.has(d)) map.set(d, set);
    }
    return map;
  }, [events, myIdSet]);

  // The activity-card goal picker offers PERSONAL goals only (the project goal is automatic).
  const personalGoals = useMemo(() => goals.filter((g) => g.kind !== 'project'), [goals]);
  const toggleGoalFor = (activityId: string, goalId: string) => {
    if (goalsForHabit(activityId).includes(goalId)) void unlinkGoal(activityId, goalId);
    else void linkGoal(activityId, goalId);
  };

  const invite = async () => {
    if (!project) return;
    await Share.share({
      message: t('detail.inviteMessage', { title: localizeProject(t, project).title, code: project.inviteCode }),
    });
  };

  const confirmLeave = () => {
    Alert.alert(t('detail.leaveTitle'), t('detail.leaveBody'), [
      { text: t('detail.stay'), style: 'cancel' },
      {
        text: t('detail.leaveConfirm'),
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
        <Topbar onBack={() => navigation.goBack()} title={t('detail.header')} onInvite={undefined} />
        <Text style={styles.loading}>{t('detail.loading')}</Text>
      </ScreenContainer>
    );
  }

  if (!project) {
    return (
      <ScreenContainer backgroundColor={BG}>
        <Topbar onBack={() => navigation.goBack()} title={t('detail.header')} onInvite={undefined} />
        <Text style={styles.loading}>{t('detail.unavailable')}</Text>
      </ScreenContainer>
    );
  }

  const text = localizeProject(t, project);

  return (
    <ScreenContainer backgroundColor={BG}>
      <Topbar onBack={() => navigation.goBack()} title={t('detail.header')} onInvite={joined ? invite : undefined} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: c.soft }]}>
          <Text style={styles.heroEmoji}>{project.emoji}</Text>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {text.title}
          </Text>
          <Text style={styles.heroMeta}>
            {t('meta', { region: text.region || t('community'), members: t('memberCount', { count: project.memberCount }) })}
          </Text>
          <Text style={styles.heroSummary}>{text.summary}</Text>
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <View style={styles.progressTop}>
            <Text style={styles.progressPct}>{pct}%</Text>
            <Text style={styles.progressCycle}>{cycleLabel(t)}</Text>
          </View>
          <ProgressBar progress={pct / 100} color={barColor} trackColor={TRACK} height={14} label={t('detail.weeklyA11y')} />
          <Text style={styles.progressCount}>
            {t('detail.thisWeek', { count: snap?.cycle.count ?? 0, goal: project.weeklyGoal, unit: text.unit })}
          </Text>
          {activeToday > 0 && (
            <Text style={[styles.pulse, { color: c.accent }]}>{t('strip.activeToday', { count: activeToday })}</Text>
          )}
          {project.reward.length > 0 && (
            <Text style={styles.reward}>{t('detail.reward', { reward: text.reward })}</Text>
          )}
        </View>

        {/* Join / membership */}
        {!joined ? (
          <View style={styles.card}>
            <View style={styles.consentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.consentTitle}>{t('detail.shareTitle')}</Text>
                <Text style={styles.consentBody}>{t('detail.shareBody')}</Text>
              </View>
              <Switch value={joinShare} onValueChange={setJoinShare} accessibilityLabel={t('detail.shareTitle')} />
            </View>
            <Pressable
              onPress={() => void joinProject(projectId, joinShare)}
              accessibilityRole="button"
              accessibilityLabel={t('detail.joinA11y')}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{t('detail.join')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.consentRow}>
              <Text style={styles.consentTitle}>{t('detail.shareTitle')}</Text>
              <Switch
                value={me?.shareFeed ?? true}
                onValueChange={(v) => void setShareFeed(projectId, v)}
                accessibilityLabel={t('detail.shareTitle')}
              />
            </View>
          </View>
        )}

        {/* Big, fun activity tiles: add your own, or ask peers who've solved it. */}
        {joined && (
          <View style={styles.tileRow}>
            <ActivityTile icon="✨" label={t('detail.tileNew')} sub={t('detail.tileNewSub')} onPress={() => { setAddDates(null); setAddOpen(true); }} tint={c.accent} />
            <ActivityTile icon="🌍" label={t('detail.tileAsk')} sub={t('detail.tileAskSub')} onPress={() => navigation.navigate('PostComposer', { projectId, kind: 'ask' })} tint={VIOLET} />
          </View>
        )}

        {/* YOUR activities — beautiful cards: Do / Battle / Edit / Remove + goals. */}
        {joined && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>{t('detail.yourActivities')}</Text>
              {myQuests.length > 1 && (
                <Pressable
                  onPress={() => navigation.navigate('BattleSetup', { questIds: myQuests.map((q) => q.id) })}
                  accessibilityRole="button"
                  accessibilityLabel={t('detail.slayA11y')}
                  hitSlop={8}
                >
                  <Text style={styles.slay}>{t('detail.slay')}</Text>
                </Pressable>
              )}
            </View>
            {myQuests.length === 0 ? (
              <Text style={styles.empty}>{t('detail.yourActivitiesEmpty')}</Text>
            ) : (
              <View style={styles.cardList}>
                {myQuests.map((q) => {
                  const gid = bucketIdFor(q.id);
                  const g = gid ? buckets.find((b) => b.id === gid) : undefined;
                  const gc = g ? getBucketColor(g.colorId) : undefined;
                  return (
                    <OwnedActivityCard
                      key={q.id}
                      emoji={CATEGORY_META[q.category].icon}
                      title={q.title}
                      accent={c.accent}
                      goals={personalGoals}
                      inGoalIds={new Set(goalsForHabit(q.id))}
                      onToggleGoal={(goalId) => toggleGoalFor(q.id, goalId)}
                      onNewGoal={() => navigation.navigate('GoalEditor')}
                      onAddToday={() => void togglePlanned(todayK, q.id)}
                      onToday={planned.has(q.id)}
                      groupName={g?.name ?? null}
                      {...(gc ? { groupAccent: gc.accent, groupSoft: gc.soft } : {})}
                      onMoveGroup={() => setGroupTarget({ id: q.id, title: q.title })}
                      onBattle={() => navigation.navigate('BattleSetup', { questId: q.id })}
                      onEdit={() => navigation.navigate('QuestEditor', { questId: q.id })}
                      onRemove={() => void unlinkHabit(q.id, projectId)}
                    />
                  );
                })}
              </View>
            )}
            {projectGoal && (
              <Pressable onPress={() => navigation.navigate('GoalFocus', { goalId: projectGoal.id })} accessibilityRole="button" accessibilityLabel={t('detail.viewGoalA11y')} style={styles.makeGoal}>
                <Text style={styles.makeGoalText}>{t('detail.viewGoal')}</Text>
              </Pressable>
            )}

            {myQuests.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('detail.yourCalendar')}</Text>
                <MiniScheduler
                  quests={myQuests}
                  getPlan={getPlan}
                  togglePlanned={togglePlanned}
                  doneByDay={doneByDay}
                  accent={c.accent}
                  onAddForDay={(day) => {
                    setAddDates([day]);
                    setAddOpen(true);
                  }}
                />
              </>
            )}
          </>
        )}

        {/* Suggested activities — big adopt cards (daily habit, reuse by name). */}
        {project.suggestedHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('detail.suggested')}</Text>
            <View style={styles.cardList}>
              {project.suggestedHabits.map((h, i) => {
                const owned = questByTitle(h.title);
                const linked = owned ? linkedProjectIds(owned.id).includes(projectId) : false;
                return (
                  <SuggestedActivityCard
                    key={`${h.title}-${i}`}
                    emoji={CATEGORY_META[h.category].icon}
                    title={localizeFeaturedHabit(t, project.id, i, h.title)}
                    contribution={t('detail.contribution', { value: h.contribution, unit: text.unit })}
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
            accessibilityLabel={t('detail.postUpdateA11y')}
            style={styles.postUpdate}
          >
            <Text style={styles.postUpdateText}>{t('detail.postUpdate')}</Text>
          </Pressable>
        )}

        {/* Activity feed */}
        <Text style={styles.sectionLabel}>{t('detail.liveActivity')}</Text>
        {(snap?.feed.length ?? 0) === 0 ? (
          <Text style={styles.empty}>{t('detail.noActivity')}</Text>
        ) : (
          snap!.feed.map((f: Contribution) => (
            <View key={f.id} style={styles.feedRow}>
              <View style={[styles.feedDot, { backgroundColor: c.accent }]} />
              <Text style={styles.feedText} numberOfLines={2}>
                <Text style={styles.feedName}>{f.displayName}</Text> {f.habitTitle} · +{f.value}
                {f.mode === 'onsite' ? t('detail.onSite') : ''}
              </Text>
              <Text style={styles.feedTime}>{timeAgo(f.createdAt, t)}</Text>
            </View>
          ))
        )}

        {/* Members */}
        <Text style={styles.sectionLabel}>{t('detail.members', { count: snap?.members.length ?? 0 })}</Text>
        {snap?.members.map((m) => (
          <View key={m.uid} style={styles.memberRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {m.displayName}
              {m.role === 'owner' ? t('detail.owner') : ''}
              {m.uid === uid ? t('detail.you') : ''}
            </Text>
            <Text style={styles.memberTotal}>{m.contributionTotal}</Text>
          </View>
        ))}

        {joined && (
          <Pressable onPress={confirmLeave} accessibilityRole="button" accessibilityLabel={t('detail.leaveA11y')} style={styles.leave}>
            <Text style={styles.leaveText}>{t('detail.leave')}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Add your own activity, pre-linked to this project (daily, or a specific day from the calendar). */}
      <AddActivitySheet
        visible={addOpen}
        onClose={() => {
          setAddOpen(false);
          setAddDates(null);
        }}
        defaultProjectIds={[projectId]}
        defaultDates={addDates}
      />

      <MoveToBucketSheet
        visible={groupTarget !== null}
        activityTitle={groupTarget?.title ?? ''}
        buckets={buckets}
        {...(groupTarget && bucketIdFor(groupTarget.id) ? { currentBucketId: bucketIdFor(groupTarget.id) } : {})}
        onSelect={(bucketId) => {
          if (groupTarget) void assignActivity(groupTarget.id, bucketId);
          setGroupTarget(null);
        }}
        onClose={() => setGroupTarget(null)}
      />
    </ScreenContainer>
  );
}

function Topbar({ onBack, title, onInvite }: { onBack: () => void; title: string; onInvite?: () => void }) {
  const { t } = useTranslation('projects');
  return (
    <View style={styles.topbar}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('detail.close')} hitSlop={12}>
        <Text style={styles.chevron}>‹</Text>
      </Pressable>
      <Text style={styles.topTitle} accessibilityRole="header">
        {title}
      </Text>
      {onInvite ? (
        <Pressable onPress={onInvite} accessibilityRole="button" accessibilityLabel={t('detail.inviteA11y')} hitSlop={12}>
          <Text style={styles.invite}>{t('detail.invite')}</Text>
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
