/**
 * Firestore NotificationsBackend — cross-device inbox.
 *   users/{uid}/notifications/{id}   { recipientUid, type, actorUid, actorName,
 *                                      actorPresentation?, postId?, emoji?,
 *                                      createdAt, read }
 * The actor writes into the recipient's subcollection (rules allow create only
 * when request.resource.data.recipientUid == uid).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase/app';
import { sortNewest, type AppNotification, type NotificationDraft, type NotificationType } from '@/lib/notifications';
import type { NotificationsBackend, Unsubscribe } from './NotificationsBackend';

const INBOX_LIMIT = 50;

function toNotification(id: string, d: DocumentData): AppNotification {
  const type: NotificationType = d.type === 'comment' || d.type === 'follow' ? d.type : 'reaction';
  return {
    id,
    recipientUid: d.recipientUid ?? '',
    type,
    actorUid: d.actorUid ?? '',
    actorName: d.actorName ?? 'Hero',
    ...(d.actorPresentation ? { actorPresentation: d.actorPresentation } : {}),
    ...(d.postId ? { postId: d.postId } : {}),
    ...(d.emoji ? { emoji: d.emoji } : {}),
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    read: d.read === true,
  };
}

export class FirebaseNotificationsBackend implements NotificationsBackend {
  readonly isShared = true;
  private get db(): Firestore {
    return getDb();
  }

  subscribe(uid: string, cb: (items: AppNotification[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(INBOX_LIMIT)),
      (s) => cb(sortNewest(s.docs.map((n) => toNotification(n.id, n.data())))),
    );
  }

  async add(draft: NotificationDraft): Promise<void> {
    const ref = doc(collection(this.db, 'users', draft.recipientUid, 'notifications'));
    await setDoc(ref, { ...draft, read: false });
  }

  async markAllRead(uid: string): Promise<void> {
    const unread = await getDocs(query(collection(this.db, 'users', uid, 'notifications'), where('read', '==', false)));
    if (unread.empty) return;
    const batch = writeBatch(this.db);
    for (const d of unread.docs) batch.update(d.ref, { read: true });
    await batch.commit();
  }

  async deleteMyData(uid: string): Promise<void> {
    const all = await getDocs(collection(this.db, 'users', uid, 'notifications'));
    for (const d of all.docs) await deleteDoc(d.ref);
  }
}
