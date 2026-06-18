/**
 * Firestore CommunityBackend — cross-device realtime social layer.
 *   posts/{postId}                     { author, text, kind, project?, reactions{uid:emoji}, commentCount, createdAt }
 *   posts/{postId}/comments/{id}       the thread
 *   users/{uid}/following/{targetUid}  the network graph
 *
 * Reactions are an inline { uid: emoji } map (counts + the viewer's own reaction
 * derive from it) — one doc render, no fan-out. Feed scope (network/project) is
 * filtered client-side over the most-recent posts.
 */
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase/app';
import {
  postInScope,
  sortFeed,
  type Comment,
  type CommunityIdentity,
  type FeedScope,
  type Post,
  type PostDraft,
  type ReactionEmoji,
} from '@/lib/community';
import type { CommunityBackend, Unsubscribe } from './CommunityBackend';

const FEED_LIMIT = 100;

function toPost(id: string, d: DocumentData): Post {
  return {
    id,
    authorUid: d.authorUid ?? '',
    displayName: d.displayName ?? 'Hero',
    ...(d.presentation ? { presentation: d.presentation } : {}),
    text: d.text ?? '',
    kind: d.kind === 'contribution' ? 'contribution' : 'post',
    ...(d.projectId ? { projectId: d.projectId } : {}),
    ...(d.projectTitle ? { projectTitle: d.projectTitle } : {}),
    ...(d.projectColorId ? { projectColorId: d.projectColorId } : {}),
    ...(d.habitTitle ? { habitTitle: d.habitTitle } : {}),
    ...(typeof d.value === 'number' ? { value: d.value } : {}),
    ...(d.mode ? { mode: d.mode } : {}),
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    reactions: (d.reactions ?? {}) as Record<string, ReactionEmoji>,
    commentCount: typeof d.commentCount === 'number' ? d.commentCount : 0,
  };
}

function toComment(id: string, postId: string, d: DocumentData): Comment {
  return {
    id,
    postId,
    uid: d.uid ?? '',
    displayName: d.displayName ?? 'Hero',
    ...(d.presentation ? { presentation: d.presentation } : {}),
    text: d.text ?? '',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  };
}

export class FirebaseCommunityBackend implements CommunityBackend {
  readonly isShared = true;
  private get db(): Firestore {
    return getDb();
  }

  subscribeFeed(scope: FeedScope, uid: string, following: ReadonlySet<string>, cb: (posts: Post[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, 'posts'), orderBy('createdAt', 'desc'), limit(FEED_LIMIT)),
      (s) => {
        const posts = s.docs.map((p) => toPost(p.id, p.data())).filter((p) => postInScope(p, scope, following, uid));
        cb(sortFeed(posts));
      },
    );
  }

  async createPost(identity: CommunityIdentity, draft: PostDraft): Promise<Post> {
    const ref = doc(collection(this.db, 'posts'));
    const post: Post = {
      id: ref.id,
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
      createdAt: Date.now(),
      reactions: {},
      commentCount: 0,
    };
    await setDoc(ref, { ...post, serverAt: serverTimestamp() });
    return post;
  }

  subscribeComments(postId: string, cb: (comments: Comment[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(300)),
      (s) => cb(s.docs.map((c) => toComment(c.id, postId, c.data()))),
    );
  }

  async addComment(identity: CommunityIdentity, postId: string, text: string): Promise<void> {
    const batch = writeBatch(this.db);
    batch.set(doc(collection(this.db, 'posts', postId, 'comments')), {
      uid: identity.uid,
      displayName: identity.displayName,
      ...(identity.presentation ? { presentation: identity.presentation } : {}),
      text: text.trim(),
      createdAt: Date.now(),
      serverAt: serverTimestamp(),
    });
    batch.update(doc(this.db, 'posts', postId), { commentCount: increment(1) });
    await batch.commit();
  }

  async setReaction(uid: string, postId: string, emoji: ReactionEmoji | null): Promise<void> {
    await updateDoc(doc(this.db, 'posts', postId), {
      [`reactions.${uid}`]: emoji === null ? deleteField() : emoji,
    });
  }

  subscribeFollowing(uid: string, cb: (following: string[]) => void): Unsubscribe {
    return onSnapshot(collection(this.db, 'users', uid, 'following'), (s) => cb(s.docs.map((d) => d.id)));
  }

  async follow(uid: string, targetUid: string): Promise<void> {
    if (uid === targetUid) return;
    await setDoc(doc(this.db, 'users', uid, 'following', targetUid), { at: Date.now() });
  }

  async unfollow(uid: string, targetUid: string): Promise<void> {
    await deleteDoc(doc(this.db, 'users', uid, 'following', targetUid));
  }
}
