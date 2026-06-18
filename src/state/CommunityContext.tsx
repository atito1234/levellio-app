import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { communityBackend, type Unsubscribe } from '@/services/community';
import type { Comment, CommunityIdentity, FeedScope, Post, PostDraft, ReactionEmoji } from '@/lib/community';

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
  addComment: (postId: string, text: string) => Promise<void>;
  setReaction: (postId: string, emoji: ReactionEmoji | null) => Promise<void>;
  subscribeFeed: (scope: FeedScope, cb: (posts: Post[]) => void) => Unsubscribe;
  subscribeComments: (postId: string, cb: (comments: Comment[]) => void) => Unsubscribe;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

/** Owns the social layer: the viewer's network + feed/comment/reaction actions. */
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;
  const [following, setFollowing] = useState<Set<string>>(new Set());
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
    return unsub;
  }, [uid]);

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
    async (postId: string, text: string) => {
      if (identity) await communityBackend.addComment(identity, postId, text);
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
    (scope: FeedScope, cb: (posts: Post[]) => void) => communityBackend.subscribeFeed(scope, uid ?? '', following, cb),
    [uid, following],
  );
  const subscribeComments = useCallback(
    (postId: string, cb: (comments: Comment[]) => void) => communityBackend.subscribeComments(postId, cb),
    [],
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
    }),
    [ready, uid, following, follow, unfollow, createPost, addComment, setReaction, subscribeFeed, subscribeComments],
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within a CommunityProvider');
  return ctx;
}
