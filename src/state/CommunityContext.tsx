import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { communityBackend, type Unsubscribe } from '@/services/community';
import { AsyncStorageStore } from '@/services/storage';
import { colors, radii, spacing, typography } from '@/theme';
import { canViewPost, type Comment, type CommunityIdentity, type FeedScope, type Post, type PostDraft, type ReactionEmoji, type SuggestedHabit } from '@/lib/community';
import { newReport, REPORT_REASONS, type ApplicationStatus, type NewProjectApplication, type ProjectApplication, type Report, type ReportReason, type ReportTarget } from '@/lib/moderation';

// Local safety lists (per-uid): people you've blocked/muted + posts you've hidden.
const safetyStore = new AsyncStorageStore();
const blockedKey = (uid: string) => `levellio:community:blocked:${uid}`;
const mutedKey = (uid: string) => `levellio:community:muted:${uid}`;
const hiddenKey = (uid: string) => `levellio:community:hidden:${uid}`;
async function loadList(key: string): Promise<string[]> {
  const raw = await safetyStore.getItem(key);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

interface CommunityContextValue {
  ready: boolean;
  signedIn: boolean;
  /** True when collaboration is cross-device (Firebase). */
  isShared: boolean;
  uid: string | null;
  /** The set of uids the viewer follows (their network). */
  following: Set<string>;
  isFollowing: (uid: string) => boolean;
  follow: (targetUid: string) => Promise<void>;
  unfollow: (targetUid: string) => Promise<void>;
  createPost: (draft: PostDraft) => Promise<Post | null>;
  addComment: (postId: string, text: string, suggestedHabit?: SuggestedHabit) => Promise<void>;
  setReaction: (postId: string, emoji: ReactionEmoji | null) => Promise<void>;
  subscribeFeed: (scope: FeedScope, cb: (posts: Post[]) => void) => Unsubscribe;
  subscribeComments: (postId: string, cb: (comments: Comment[]) => void) => Unsubscribe;
  /** Safety: people you've blocked (their content is hidden everywhere). */
  isBlocked: (uid: string) => boolean;
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  /** Lighter than block: hide a user's content without blocking interaction. */
  isMuted: (uid: string) => boolean;
  muteUser: (targetUid: string) => Promise<void>;
  unmuteUser: (targetUid: string) => Promise<void>;

  // --- Reporting (opens a shared reason sheet, then files to the backend) ---
  /** Open the report sheet for a target (content or user). */
  requestReport: (target: ReportTarget) => void;
  /** The report awaiting a reason (drives the shared ReportSheet), or null. */
  pendingReport: ReportTarget | null;
  /** File the pending report with a reason, then hide it locally. */
  submitPendingReport: (reason: ReportReason) => Promise<void>;
  cancelReport: () => void;

  // --- Owner moderation console (only meaningful when isModerator) ----------
  isModerator: boolean;
  subscribeReports: (cb: (reports: Report[]) => void) => Unsubscribe;
  resolveReport: (reportId: string) => Promise<void>;
  banUser: (uid: string) => Promise<void>;
  removeContent: (target: ReportTarget) => Promise<void>;

  // --- Delegated project creation (application → owner approval) -------------
  /** The viewer's most recent project application (gates project creation). */
  myApplication: ProjectApplication | null;
  submitProjectApplication: (app: Omit<NewProjectApplication, 'applicantUid' | 'applicantName'>) => Promise<void>;
  subscribeApplications: (cb: (apps: ProjectApplication[]) => void) => Unsubscribe;
  setApplicationStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

/** Owns the social layer: the viewer's network + feed/comment/reaction actions. */
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pendingReport, setPendingReport] = useState<ReportTarget | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [myApplication, setMyApplication] = useState<ProjectApplication | null>(null);
  const [ready, setReady] = useState(false);

  const identity = useMemo<CommunityIdentity | null>(() => {
    if (!uid) return null;
    return {
      uid,
      displayName: account?.displayName?.trim() || character?.name?.trim() || 'Hero',
      presentation: character?.presentation,
    };
  }, [uid, account?.displayName, character?.name, character?.presentation]);

  useEffect(() => {
    if (!uid) {
      setFollowing(new Set());
      setIsModerator(false);
      setMyApplication(null);
      setReady(false);
      return;
    }
    const unsub = communityBackend.subscribeFollowing(uid, (ids) => {
      setFollowing(new Set(ids));
      setReady(true);
    });
    void loadList(blockedKey(uid)).then((ids) => setBlocked(new Set(ids)));
    void loadList(mutedKey(uid)).then((ids) => setMuted(new Set(ids)));
    void loadList(hiddenKey(uid)).then((ids) => setHidden(new Set(ids)));
    void communityBackend.isModerator(uid).then(setIsModerator).catch(() => setIsModerator(false));
    void communityBackend.myLatestApplication(uid).then(setMyApplication).catch(() => setMyApplication(null));
    return unsub;
  }, [uid]);

  const blockUser = useCallback(
    async (targetUid: string) => {
      if (!uid) return;
      const next = new Set(blocked).add(targetUid);
      setBlocked(next);
      await safetyStore.setItem(blockedKey(uid), JSON.stringify([...next]));
    },
    [uid, blocked],
  );
  const unblockUser = useCallback(
    async (targetUid: string) => {
      if (!uid) return;
      const next = new Set(blocked);
      next.delete(targetUid);
      setBlocked(next);
      await safetyStore.setItem(blockedKey(uid), JSON.stringify([...next]));
    },
    [uid, blocked],
  );
  const hidePost = useCallback(
    async (postId: string) => {
      if (!uid) return;
      const next = new Set(hidden).add(postId);
      setHidden(next);
      await safetyStore.setItem(hiddenKey(uid), JSON.stringify([...next]));
    },
    [uid, hidden],
  );
  const muteUser = useCallback(
    async (targetUid: string) => {
      if (!uid) return;
      const next = new Set(muted).add(targetUid);
      setMuted(next);
      await safetyStore.setItem(mutedKey(uid), JSON.stringify([...next]));
    },
    [uid, muted],
  );
  const unmuteUser = useCallback(
    async (targetUid: string) => {
      if (!uid) return;
      const next = new Set(muted);
      next.delete(targetUid);
      setMuted(next);
      await safetyStore.setItem(mutedKey(uid), JSON.stringify([...next]));
    },
    [uid, muted],
  );

  // Reporting: requestReport opens the shared reason sheet; submit files it.
  const requestReport = useCallback((target: ReportTarget) => setPendingReport(target), []);
  const cancelReport = useCallback(() => setPendingReport(null), []);
  const submitPendingReport = useCallback(
    async (reason: ReportReason) => {
      const target = pendingReport;
      setPendingReport(null);
      if (!uid || !target) return;
      await communityBackend.submitReport(newReport(target, uid, reason));
      // Immediately hide it for the reporter (the owner removes it within 24h).
      if (target.type === 'post') await hidePost(target.id);
    },
    [uid, pendingReport, hidePost],
  );

  // Owner console passthroughs.
  const subscribeReports = useCallback((cb: (reports: Report[]) => void) => communityBackend.subscribeReports(cb), []);
  const resolveReport = useCallback((reportId: string) => communityBackend.resolveReport(reportId), []);
  const banUser = useCallback((targetUid: string) => communityBackend.banUser(targetUid), []);
  const removeContent = useCallback((target: ReportTarget) => communityBackend.removeContent(target), []);

  // Delegated project creation.
  const submitProjectApplication = useCallback(
    async (app: Omit<NewProjectApplication, 'applicantUid' | 'applicantName'>) => {
      if (!identity) return;
      await communityBackend.submitProjectApplication({ ...app, applicantUid: identity.uid, applicantName: identity.displayName });
      const latest = await communityBackend.myLatestApplication(identity.uid);
      setMyApplication(latest);
    },
    [identity],
  );
  const subscribeApplications = useCallback((cb: (apps: ProjectApplication[]) => void) => communityBackend.subscribeApplications(cb), []);
  const setApplicationStatus = useCallback((appId: string, status: ApplicationStatus) => communityBackend.setApplicationStatus(appId, status), []);

  const follow = useCallback(async (targetUid: string) => {
    if (uid) await communityBackend.follow(uid, targetUid);
  }, [uid]);
  const unfollow = useCallback(async (targetUid: string) => {
    if (uid) await communityBackend.unfollow(uid, targetUid);
  }, [uid]);

  const createPost = useCallback(
    async (draft: PostDraft) => {
      if (!identity) return null;
      return communityBackend.createPost(identity, draft);
    },
    [identity],
  );
  const addComment = useCallback(
    async (postId: string, text: string, suggestedHabit?: SuggestedHabit) => {
      if (identity) await communityBackend.addComment(identity, postId, text, suggestedHabit);
    },
    [identity],
  );
  const setReaction = useCallback(
    async (postId: string, emoji: ReactionEmoji | null) => {
      if (uid) await communityBackend.setReaction(uid, postId, emoji);
    },
    [uid],
  );

  const subscribeFeed = useCallback(
    (scope: FeedScope, cb: (posts: Post[]) => void) =>
      communityBackend.subscribeFeed(scope, uid ?? '', following, (posts) =>
        // Audience gate + safety: hide posts the viewer may not see, blocked
        // authors, and individually reported/hidden posts. (Server rules also
        // enforce audience; this is the client-side belt-and-suspenders.)
        cb(
          posts.filter(
            (p) =>
              canViewPost(p, uid ?? '', following) &&
              !blocked.has(p.authorUid) &&
              !muted.has(p.authorUid) &&
              !hidden.has(p.id),
          ),
        ),
      ),
    [uid, following, blocked, muted, hidden],
  );
  const subscribeComments = useCallback(
    (postId: string, cb: (comments: Comment[]) => void) =>
      communityBackend.subscribeComments(postId, (comments) =>
        cb(comments.filter((c) => !blocked.has(c.uid) && !muted.has(c.uid))),
      ),
    [blocked, muted],
  );

  const value = useMemo<CommunityContextValue>(
    () => ({
      ready,
      signedIn: Boolean(uid),
      isShared: communityBackend.isShared,
      uid,
      following,
      isFollowing: (id: string) => following.has(id),
      follow,
      unfollow,
      createPost,
      addComment,
      setReaction,
      subscribeFeed,
      subscribeComments,
      isBlocked: (id: string) => blocked.has(id),
      blockUser,
      unblockUser,
      isMuted: (id: string) => muted.has(id),
      muteUser,
      unmuteUser,
      requestReport,
      pendingReport,
      submitPendingReport,
      cancelReport,
      isModerator,
      subscribeReports,
      resolveReport,
      banUser,
      removeContent,
      myApplication,
      submitProjectApplication,
      subscribeApplications,
      setApplicationStatus,
    }),
    [ready, uid, following, blocked, muted, follow, unfollow, createPost, addComment, setReaction, subscribeFeed, subscribeComments, blockUser, unblockUser, muteUser, unmuteUser, requestReport, pendingReport, submitPendingReport, cancelReport, isModerator, subscribeReports, resolveReport, banUser, removeContent, myApplication, submitProjectApplication, subscribeApplications, setApplicationStatus],
  );

  return (
    <CommunityContext.Provider value={value}>
      {children}
      <ReportSheet />
    </CommunityContext.Provider>
  );
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within a CommunityProvider');
  return ctx;
}

/**
 * Shared report sheet — one mounted instance (inside the provider) that any
 * surface opens via `requestReport`. Minimal + fast: pick a reason, it files and
 * closes. Rendered above the app as a Modal (safe — all screens are card-presented).
 */
function ReportSheet() {
  const { t } = useTranslation(['feed', 'common']);
  const { pendingReport, submitPendingReport, cancelReport } = useCommunity();
  const visible = pendingReport !== null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancelReport}>
      <Pressable style={reportStyles.backdrop} onPress={cancelReport} accessibilityRole="button" accessibilityLabel={t('common:action.cancel')}>
        <Pressable style={reportStyles.sheet} onPress={() => {}}>
          <View style={reportStyles.handle} />
          <Text style={reportStyles.title}>{t('feed:report.title')}</Text>
          <Text style={reportStyles.sub}>{t('feed:report.sub')}</Text>
          <View style={reportStyles.reasons}>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => void submitPendingReport(r)}
                accessibilityRole="button"
                style={reportStyles.reason}
              >
                <Text style={reportStyles.reasonText}>{t(`feed:report.reason_${r}`)}</Text>
                <Text style={reportStyles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={cancelReport} accessibilityRole="button" style={reportStyles.cancel}>
            <Text style={reportStyles.cancelText}>{t('common:action.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const reportStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,17,30,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  sub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  reasons: { gap: spacing.xs },
  reason: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  reasonText: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  chevron: { ...typography.title, color: colors.textMuted },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  cancelText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
});
