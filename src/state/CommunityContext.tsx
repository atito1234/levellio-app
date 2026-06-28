import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { communityBackend, type Unsubscribe } from '@/services/community';
import { AsyncStorageStore } from '@/services/storage';
import { canViewPost, type Comment, type CommunityIdentity, type FeedScope, type Post, type PostDraft, type ReactionEmoji, type SuggestedHabit } from '@/lib/community';

// Local safety lists (per-uid): people you've blocked + posts you've hidden/reported.
const safetyStore = new AsyncStorageStore();
const blockedKey = (uid: string) => `levellio:community:blocked:${uid}`;
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
  /** Hide + flag a single post (report). */
  reportPost: (postId: string) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

/** Owns the social layer: the viewer's network + feed/comment/reaction actions. */
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
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
      setReady(false);
      return;
    }
    const unsub = communityBackend.subscribeFollowing(uid, (ids) => {
      setFollowing(new Set(ids));
      setReady(true);
    });
    void loadList(blockedKey(uid)).then((ids) => setBlocked(new Set(ids)));
    void loadList(hiddenKey(uid)).then((ids) => setHidden(new Set(ids)));
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
  const reportPost = useCallback(
    async (postId: string) => {
      if (!uid) return;
      const next = new Set(hidden).add(postId);
      setHidden(next);
      await safetyStore.setItem(hiddenKey(uid), JSON.stringify([...next]));
    },
    [uid, hidden],
  );

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
            (p) => canViewPost(p, uid ?? '', following) && !blocked.has(p.authorUid) && !hidden.has(p.id),
          ),
        ),
      ),
    [uid, following, blocked, hidden],
  );
  const subscribeComments = useCallback(
    (postId: string, cb: (comments: Comment[]) => void) =>
      communityBackend.subscribeComments(postId, (comments) => cb(comments.filter((c) => !blocked.has(c.uid)))),
    [blocked],
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
      reportPost,
    }),
    [ready, uid, following, blocked, follow, unfollow, createPost, addComment, setReaction, subscribeFeed, subscribeComments, blockUser, unblockUser, reportPost],
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within a CommunityProvider');
  return ctx;
}
