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
import { MIN_INVITE_CODE_LENGTH, normalizeInviteCode } from '@/lib/projects';
import type { ApplicationStatus, NewProjectApplication, NewReport, ProjectApplication, Report, ReportTarget } from '@/lib/moderation';
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
      ...(draft.category ? { category: draft.category } : {}),
      ...(draft.audience ? { audience: draft.audience } : {}),
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

  async deleteMyData(uid: string): Promise<void> {
    const posts = await this.allPosts();
    const keep: Post[] = [];
    for (const p of posts) {
      if (p.authorUid === uid) {
        await this.store.removeItem(commentsKey(p.id)); // drop my post + its thread
        continue;
      }
      // Strip my reaction + my comments from posts I don't own.
      if (p.reactions[uid]) {
        const r = { ...p.reactions };
        delete r[uid];
        p.reactions = r;
      }
      const comments = await this.read<Comment[]>(commentsKey(p.id), []);
      const filtered = comments.filter((c) => c.uid !== uid);
      if (filtered.length !== comments.length) {
        await this.write(commentsKey(p.id), filtered);
        p.commentCount = filtered.length;
        this.commentListeners.get(p.id)?.forEach((fn) => fn());
      }
      keep.push(p);
    }
    await this.write(POSTS_KEY, keep);
    await this.store.removeItem(followingKey(uid));
    this.feedListeners.forEach((fn) => fn());
    this.followListeners.get(uid)?.forEach((fn) => fn());
  }

  // --- Moderation -----------------------------------------------------------
  // Offline/single-device: there are no other users to moderate. Reports are
  // recorded locally (so nothing throws) and the console stays empty. Real
  // moderation lights up with the Firebase backend.
  async submitReport(report: NewReport): Promise<void> {
    const all = await this.read<unknown[]>(`${NS}:reports`, []);
    await this.write(`${NS}:reports`, [...all, { ...report, createdAt: Date.now() }]);
  }
  async isModerator(): Promise<boolean> {
    return false;
  }
  subscribeReports(cb: (reports: Report[]) => void): Unsubscribe {
    cb([]);
    return () => {};
  }
  async resolveReport(): Promise<void> {}
  async banUser(): Promise<void> {}
  async removeContent(_target: ReportTarget): Promise<void> {}
  // Offline/dev: no founding-code registry, so accept any well-formed code.
  async isValidFoundingCode(code: string): Promise<boolean> {
    return normalizeInviteCode(code).length >= MIN_INVITE_CODE_LENGTH;
  }

  // Offline/dev: no admin to approve, so auto-approve so a solo user can create.
  async submitProjectApplication(app: NewProjectApplication): Promise<void> {
    const rec: ProjectApplication = { ...app, id: genId('app'), status: 'approved', createdAt: Date.now() };
    await this.write(`${NS}:myApplication`, rec);
  }
  async myLatestApplication(): Promise<ProjectApplication | null> {
    return this.read<ProjectApplication | null>(`${NS}:myApplication`, null);
  }
  subscribeApplications(cb: (apps: ProjectApplication[]) => void): Unsubscribe {
    cb([]);
    return () => {};
  }
  async setApplicationStatus(_appId: string, _status: ApplicationStatus): Promise<void> {}
}

// Exported only for tests that want the toggle helper alongside the backend.
export { toggleReaction };
