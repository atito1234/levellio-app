/**
 * Local, on-device CommunityBackend (KeyValueStore seam). Posts, comments,
 * reactions, and follows live in AsyncStorage; live updates are delivered to
 * in-process subscribers so the UI feels realtime within the device. Swapping in
 * FirebaseCommunityBackend makes it cross-device with no caller changes.
 */
import type { KeyValueStore } from '@/services/storage';
import {
  postInScope,
  sortFeed,
  toggleReaction,
  type Comment,
  type CommunityIdentity,
  type FeedScope,
  type Post,
  type PostDraft,
  type ReactionEmoji,
  type SuggestedHabit,
} from '@/lib/community';
import type { CommunityBackend, Unsubscribe } from './CommunityBackend';

const NS = 'levellio:community';
const POSTS_KEY = `${NS}:posts`;
const commentsKey = (postId: string) => `${NS}:comments:${postId}`;
const followingKey = (uid: string) => `${NS}:following:${uid}`;

let seq = 0;
const genId = (p: string) => `${p}-${Date.now()}-${(seq += 1)}`;

export class LocalCommunityBackend implements CommunityBackend {
  readonly isShared = false;
  private feedListeners = new Set<() => void>();
  private commentListeners = new Map<string, Set<() => void>>();
  private followListeners = new Map<string, Set<() => void>>();

  constructor(private readonly store: KeyValueStore) {}

  private async read<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.store.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  private write<T>(key: string, value: T): Promise<void> {
    return this.store.setItem(key, JSON.stringify(value));
  }

  // --- feed ------------------------------------------------------------------

  private async allPosts(): Promise<Post[]> {
    return this.read<Post[]>(POSTS_KEY, []);
  }

  subscribeFeed(scope: FeedScope, uid: string, following: ReadonlySet<string>, cb: (posts: Post[]) => void): Unsubscribe {
    const emit = () => {
      void this.allPosts().then((posts) => cb(sortFeed(posts.filter((p) => postInScope(p, scope, following, uid)))));
    };
    this.feedListeners.add(emit);
    emit();
    return () => {
      this.feedListeners.delete(emit);
    };
  }

  async createPost(identity: CommunityIdentity, draft: PostDraft): Promise<Post> {
    const post: Post = {
      id: genId('post'),
      authorUid: identity.uid,
      displayName: identity.displayName,
      ...(identity.presentation ? { presentation: identity.presentation } : {}),
      text: draft.text.trim(),
      kind: draft.kind ?? 'post',
      ...(draft.projectId ? { projectId: draft.projectId } : {}),
      ...(draft.projectTitle ? { projectTitle: draft.projectTitle } : {}),
      ...(draft.projectColorId ? { projectColorId: draft.projectColorId } : {}),
      ...(draft.habitTitle ? { habitTitle: draft.habitTitle } : {}),
      ...(typeof draft.value === 'number' ? { value: draft.value } : {}),
      ...(draft.mode ? { mode: draft.mode } : {}),
      ...(draft.categoryHint ? { categoryHint: draft.categoryHint } : {}),
      ...(draft.media ? { media: draft.media } : {}),
      createdAt: Date.now(),
      reactions: {},
      commentCount: 0,
    };
    const posts = await this.allPosts();
    posts.push(post);
    await this.write(POSTS_KEY, posts.slice(-500));
    this.feedListeners.forEach((fn) => fn());
    return post;
  }

  // --- comments --------------------------------------------------------------

  subscribeComments(postId: string, cb: (comments: Comment[]) => void): Unsubscribe {
    const emit = () => {
      void this.read<Comment[]>(commentsKey(postId), []).then((c) => cb([...c].sort((a, b) => a.createdAt - b.createdAt)));
    };
    let set = this.commentListeners.get(postId);
    if (!set) {
      set = new Set();
      this.commentListeners.set(postId, set);
    }
    set.add(emit);
    emit();
    return () => {
      set?.delete(emit);
    };
  }

  async addComment(identity: CommunityIdentity, postId: string, text: string, suggestedHabit?: SuggestedHabit): Promise<void> {
    const comments = await this.read<Comment[]>(commentsKey(postId), []);
    comments.push({
      id: genId('c'),
      postId,
      uid: identity.uid,
      displayName: identity.displayName,
      ...(identity.presentation ? { presentation: identity.presentation } : {}),
      text: text.trim(),
      ...(suggestedHabit ? { suggestedHabit } : {}),
      createdAt: Date.now(),
    });
    await this.write(commentsKey(postId), comments);
    // Keep the denormalized count fresh.
    const posts = await this.allPosts();
    const post = posts.find((p) => p.id === postId);
    if (post) {
      post.commentCount = comments.length;
      await this.write(POSTS_KEY, posts);
    }
    this.commentListeners.get(postId)?.forEach((fn) => fn());
    this.feedListeners.forEach((fn) => fn());
  }

  // --- reactions -------------------------------------------------------------

  async setReaction(uid: string, postId: string, emoji: ReactionEmoji | null): Promise<void> {
    const posts = await this.allPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    if (emoji === null) {
      const next = { ...post.reactions };
      delete next[uid];
      post.reactions = next;
    } else {
      // Setting an emoji: ensure it's exactly that (not a toggle-off).
      post.reactions = { ...post.reactions, [uid]: emoji };
    }
    await this.write(POSTS_KEY, posts);
    this.feedListeners.forEach((fn) => fn());
    this.commentListeners.get(postId)?.forEach((fn) => fn());
  }

  // --- follows ---------------------------------------------------------------

  subscribeFollowing(uid: string, cb: (following: string[]) => void): Unsubscribe {
    const emit = () => {
      void this.read<string[]>(followingKey(uid), []).then(cb);
    };
    let set = this.followListeners.get(uid);
    if (!set) {
      set = new Set();
      this.followListeners.set(uid, set);
    }
    set.add(emit);
    emit();
    return () => {
      set?.delete(emit);
    };
  }

  async follow(uid: string, targetUid: string): Promise<void> {
    if (uid === targetUid) return;
    const set = new Set(await this.read<string[]>(followingKey(uid), []));
    set.add(targetUid);
    await this.write(followingKey(uid), [...set]);
    this.followListeners.get(uid)?.forEach((fn) => fn());
  }

  async unfollow(uid: string, targetUid: string): Promise<void> {
    const set = new Set(await this.read<string[]>(followingKey(uid), []));
    set.delete(targetUid);
    await this.write(followingKey(uid), [...set]);
    this.followListeners.get(uid)?.forEach((fn) => fn());
  }
}

// Exported only for tests that want the toggle helper alongside the backend.
export { toggleReaction };
