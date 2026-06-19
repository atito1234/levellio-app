/**
 * Stories — pure types + helpers (no I/O). A story is an ephemeral media post that
 * expires after 24h. Creation requires media upload (Blaze), so the create path is
 * gated by MEDIA_UPLOADS_ENABLED in the UI; this model layer stays ready.
 */
import type { HeroPresentation } from '@/types';
import type { PostMedia } from './community';

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export interface Story {
  id: string;
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
  media: PostMedia;
  createdAt: number;
  expiresAt: number;
}

/** A story before the backend assigns its id. */
export type StoryDraft = Omit<Story, 'id'>;

/** Expiry timestamp for a story created at `createdAt`. */
export function makeExpiry(createdAt: number): number {
  return createdAt + STORY_TTL_MS;
}

export function isExpired(s: Pick<Story, 'expiresAt'>, now = Date.now()): boolean {
  return s.expiresAt <= now;
}

/** Non-expired stories, newest first. */
export function activeStories(list: readonly Story[], now = Date.now()): Story[] {
  return list.filter((s) => !isExpired(s, now)).sort((a, b) => b.createdAt - a.createdAt);
}

export interface StoryGroup {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
  /** This user's active stories, newest first. */
  stories: Story[];
  latestAt: number;
}

/** Group active stories per user (rail entries). Own group first, then by recency. */
export function groupByUser(list: readonly Story[], now = Date.now(), myUid?: string): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const s of activeStories(list, now)) {
    let g = map.get(s.uid);
    if (!g) {
      g = { uid: s.uid, displayName: s.displayName, presentation: s.presentation, stories: [], latestAt: 0 };
      map.set(s.uid, g);
    }
    g.stories.push(s);
    g.latestAt = Math.max(g.latestAt, s.createdAt);
  }
  const groups = [...map.values()].sort((a, b) => b.latestAt - a.latestAt);
  if (myUid) {
    const mineFirst = (g: StoryGroup) => (g.uid === myUid ? 0 : 1);
    groups.sort((a, b) => mineFirst(a) - mineFirst(b));
  }
  return groups;
}
