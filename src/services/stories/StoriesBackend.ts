import type { Story, StoryDraft } from '@/lib/stories';

export type Unsubscribe = () => void;

/** Stores ephemeral stories. Mirrors the community/profile seam. */
export interface StoriesBackend {
  readonly isShared: boolean;
  /** Live subscription to currently-active (non-expired) stories. */
  subscribeActive(cb: (stories: Story[]) => void): Unsubscribe;
  /** Publish a new story (gated by MEDIA_UPLOADS_ENABLED in the UI). */
  addStory(draft: StoryDraft): Promise<void>;
  /** Remove a user's stories (account deletion). */
  deleteMyData(uid: string): Promise<void>;
}
