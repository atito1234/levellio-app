/**
 * Backend seam for the community social layer (feed, comments, reactions,
 * follows). Mirrors the ProjectsBackend philosophy: a local AsyncStorage
 * implementation runs offline/single-device and is fully testable, while a
 * Firestore implementation lights up cross-device realtime when configured.
 */
import type {
  Comment,
  CommunityIdentity,
  FeedScope,
  Post,
  PostDraft,
  ReactionEmoji,
  SuggestedHabit,
} from '@/lib/community';

export type Unsubscribe = () => void;

export interface CommunityBackend {
  /** True when backed by a real shared backend (cross-device). */
  readonly isShared: boolean;

  /** Live feed for a scope; resolves the viewer's own network as needed. */
  subscribeFeed(scope: FeedScope, uid: string, following: ReadonlySet<string>, cb: (posts: Post[]) => void): Unsubscribe;
  createPost(identity: CommunityIdentity, draft: PostDraft): Promise<Post>;

  /** Live comment thread for a post. */
  subscribeComments(postId: string, cb: (comments: Comment[]) => void): Unsubscribe;
  addComment(identity: CommunityIdentity, postId: string, text: string, suggestedHabit?: SuggestedHabit): Promise<void>;

  /** Set or clear (null) the viewer's reaction on a post. */
  setReaction(uid: string, postId: string, emoji: ReactionEmoji | null): Promise<void>;

  /** The network graph. */
  follow(uid: string, targetUid: string): Promise<void>;
  unfollow(uid: string, targetUid: string): Promise<void>;
  subscribeFollowing(uid: string, cb: (following: string[]) => void): Unsubscribe;
}
