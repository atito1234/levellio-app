import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storiesBackend } from '@/services/stories';
import { groupByUser, makeExpiry, type Story, type StoryGroup } from '@/lib/stories';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import type { PostMedia } from '@/lib/community';

/**
 * Owns the active stories rail + the (media-gated) create path. The UI only calls
 * addStory once MEDIA_UPLOADS_ENABLED is on and a media asset has been uploaded.
 */
interface StoriesContextValue {
  groups: StoryGroup[];
  myUid: string | null;
  /** Stories for one user (for the viewer). */
  storiesFor: (uid: string) => Story[];
  addStory: (media: PostMedia) => Promise<void>;
}

const StoriesContext = createContext<StoriesContextValue | null>(null);

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const unsub = storiesBackend.subscribeActive(setStories);
    return unsub;
  }, []);

  const groups = useMemo(() => groupByUser(stories, Date.now(), uid ?? undefined), [stories, uid]);

  const storiesFor = useCallback(
    (target: string) => groups.find((g) => g.uid === target)?.stories ?? [],
    [groups],
  );

  const addStory = useCallback(
    async (media: PostMedia) => {
      if (!uid) return;
      const now = Date.now();
      await storiesBackend.addStory({
        uid,
        displayName: account?.displayName?.trim() || character?.name?.trim() || 'Hero',
        ...(character?.presentation ? { presentation: character.presentation } : {}),
        media,
        createdAt: now,
        expiresAt: makeExpiry(now),
      });
    },
    [uid, account?.displayName, character?.name, character?.presentation],
  );

  const value = useMemo<StoriesContextValue>(
    () => ({ groups, myUid: uid, storiesFor, addStory }),
    [groups, uid, storiesFor, addStory],
  );

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
}

export function useStories(): StoriesContextValue {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within a StoriesProvider');
  return ctx;
}
