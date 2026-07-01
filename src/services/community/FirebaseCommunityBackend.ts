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
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
  type SuggestedHabit,
} from '@/lib/community';
import { normalizeInviteCode } from '@/lib/projects';
import type { ApplicationStatus, NewProjectApplication, NewReport, ProjectApplication, Report, ReportReason, ReportTarget, ReportTargetType } from '@/lib/moderation';
import type { CommunityBackend, Unsubscribe } from './CommunityBackend';

function toApplication(id: string, d: DocumentData): ProjectApplication {
  return {
    id,
    applicantUid: d.applicantUid ?? '',
    applicantName: d.applicantName ?? 'Hero',
    title: d.title ?? '',
    summary: d.summary ?? '',
    region: d.region ?? '',
    visibility: d.visibility === 'public' ? 'public' : 'private',
    why: d.why ?? '',
    agreedToModerate: d.agreedToModerate === true,
    status: d.status === 'approved' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  };
}

const FEED_LIMIT = 100;

function toReport(reportId: string, d: DocumentData): Report {
  return {
    reportId,
    type: (d.type ?? 'post') as ReportTargetType,
    id: d.id ?? '',
    targetUid: d.targetUid ?? '',
    reporterUid: d.reporterUid ?? '',
    reason: (d.reason ?? 'other') as ReportReason,
    status: d.status === 'resolved' ? 'resolved' : 'open',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    ...(d.preview ? { preview: d.preview } : {}),
    ...(d.postId ? { postId: d.postId } : {}),
    ...(d.threadId ? { threadId: d.threadId } : {}),
  };
}

function toPost(id: string, d: DocumentData): Post {
  return {
    id,
    authorUid: d.authorUid ?? '',
    displayName: d.displayName ?? 'Hero',
    ...(d.presentation ? { presentation: d.presentation } : {}),
    text: d.text ?? '',
    kind: d.kind === 'contribution' || d.kind === 'ask' ? d.kind : 'post',
    ...(d.projectId ? { projectId: d.projectId } : {}),
    ...(d.projectTitle ? { projectTitle: d.projectTitle } : {}),
    ...(d.projectColorId ? { projectColorId: d.projectColorId } : {}),
    ...(d.habitTitle ? { habitTitle: d.habitTitle } : {}),
    ...(typeof d.value === 'number' ? { value: d.value } : {}),
    ...(d.mode ? { mode: d.mode } : {}),
    ...(d.categoryHint ? { categoryHint: d.categoryHint } : {}),
    ...(d.category ? { category: d.category } : {}),
    ...(d.audience ? { audience: d.audience } : {}),
    ...(d.media ? { media: d.media } : {}),
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
    ...(d.suggestedHabit ? { suggestedHabit: d.suggestedHabit as SuggestedHabit } : {}),
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
      ...(draft.categoryHint ? { categoryHint: draft.categoryHint } : {}),
      ...(draft.category ? { category: draft.category } : {}),
      ...(draft.audience ? { audience: draft.audience } : {}),
      ...(draft.media ? { media: draft.media } : {}),
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

  async addComment(identity: CommunityIdentity, postId: string, text: string, suggestedHabit?: SuggestedHabit): Promise<void> {
    const batch = writeBatch(this.db);
    batch.set(doc(collection(this.db, 'posts', postId, 'comments')), {
      uid: identity.uid,
      displayName: identity.displayName,
      ...(identity.presentation ? { presentation: identity.presentation } : {}),
      text: text.trim(),
      ...(suggestedHabit ? { suggestedHabit } : {}),
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

  async deleteMyData(uid: string): Promise<void> {
    // Delete my posts (and their comment threads).
    const myPosts = await getDocs(query(collection(this.db, 'posts'), where('authorUid', '==', uid)));
    for (const p of myPosts.docs) {
      const comments = await getDocs(collection(this.db, 'posts', p.id, 'comments'));
      for (const c of comments.docs) await deleteDoc(c.ref);
      await deleteDoc(p.ref);
    }
    // Delete my comments on others' posts.
    const myComments = await getDocs(query(collectionGroup(this.db, 'comments'), where('uid', '==', uid)));
    for (const c of myComments.docs) await deleteDoc(c.ref);
    // Drop my network graph. (Reactions I left on others' posts are an emoji keyed
    // by a now-deleted uid — left as a harmless best-effort orphan.)
    const following = await getDocs(collection(this.db, 'users', uid, 'following'));
    for (const f of following.docs) await deleteDoc(f.ref);
  }

  // --- Moderation ------------------------------------------------------------
  async submitReport(report: NewReport): Promise<void> {
    const ref = doc(collection(this.db, 'reports'));
    await setDoc(ref, { ...report, status: 'open', createdAt: Date.now(), serverAt: serverTimestamp() });
  }

  async isModerator(uid: string): Promise<boolean> {
    if (!uid) return false;
    try {
      return (await getDoc(doc(this.db, 'admins', uid))).exists();
    } catch {
      return false;
    }
  }

  subscribeReports(cb: (reports: Report[]) => void): Unsubscribe {
    // No orderBy (avoids a composite index); sort newest-first client-side.
    return onSnapshot(
      query(collection(this.db, 'reports'), where('status', '==', 'open'), limit(200)),
      (s) => cb(s.docs.map((d) => toReport(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)),
      () => cb([]), // non-admins get permission-denied → empty queue
    );
  }

  async resolveReport(reportId: string): Promise<void> {
    await updateDoc(doc(this.db, 'reports', reportId), { status: 'resolved', resolvedAt: Date.now() });
  }

  async banUser(uid: string): Promise<void> {
    await setDoc(doc(this.db, 'bans', uid), { at: Date.now() });
  }

  async removeContent(target: ReportTarget): Promise<void> {
    switch (target.type) {
      case 'post':
        await deleteDoc(doc(this.db, 'posts', target.id));
        break;
      case 'comment':
        if (target.postId) await deleteDoc(doc(this.db, 'posts', target.postId, 'comments', target.id));
        break;
      case 'message':
        if (target.threadId) await deleteDoc(doc(this.db, 'threads', target.threadId, 'messages', target.id));
        break;
      case 'story':
        await deleteDoc(doc(this.db, 'stories', target.id));
        break;
      case 'profile':
        await deleteDoc(doc(this.db, 'profiles', target.id));
        break;
      case 'user':
        break; // nothing to delete; ban handles ejection
    }
  }

  async isValidFoundingCode(code: string): Promise<boolean> {
    const norm = normalizeInviteCode(code);
    if (!norm) return false;
    try {
      return (await getDoc(doc(this.db, 'foundingCodes', norm))).exists();
    } catch {
      return false;
    }
  }

  // --- Project applications --------------------------------------------------
  async submitProjectApplication(app: NewProjectApplication): Promise<void> {
    const ref = doc(collection(this.db, 'projectApplications'));
    await setDoc(ref, { ...app, status: 'pending', createdAt: Date.now(), serverAt: serverTimestamp() });
  }

  async myLatestApplication(uid: string): Promise<ProjectApplication | null> {
    if (!uid) return null;
    // Single where (no composite index); pick the newest client-side.
    const snap = await getDocs(query(collection(this.db, 'projectApplications'), where('applicantUid', '==', uid)));
    const apps = snap.docs.map((d) => toApplication(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
    return apps[0] ?? null;
  }

  subscribeApplications(cb: (apps: ProjectApplication[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, 'projectApplications'), where('status', '==', 'pending'), limit(100)),
      (s) => cb(s.docs.map((d) => toApplication(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)),
      () => cb([]),
    );
  }

  async setApplicationStatus(appId: string, status: ApplicationStatus): Promise<void> {
    await updateDoc(doc(this.db, 'projectApplications', appId), { status, decidedAt: Date.now() });
  }
}
