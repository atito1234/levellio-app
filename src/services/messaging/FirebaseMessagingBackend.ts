/**
 * Firestore MessagingBackend — cross-device 1:1 text DMs.
 *   threads/{threadId}                  { participants[], names{}, presentations{},
 *                                         lastText, lastAt, lastSenderUid, readAt{} }
 *   threads/{threadId}/messages/{id}    { senderUid, text, createdAt }
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  newThread,
  sortThreads,
  threadIdFor,
  type ChatPartner,
  type Message,
  type Thread,
} from '@/lib/messaging';
import type { MessagingBackend, Unsubscribe } from './MessagingBackend';

const MSG_LIMIT = 200;

function toThread(id: string, d: DocumentData): Thread {
  return {
    id,
    participants: Array.isArray(d.participants) ? d.participants : [],
    names: d.names ?? {},
    presentations: d.presentations ?? {},
    lastText: d.lastText ?? '',
    lastAt: typeof d.lastAt === 'number' ? d.lastAt : 0,
    lastSenderUid: d.lastSenderUid ?? '',
    readAt: d.readAt ?? {},
  };
}

function toMessage(id: string, threadId: string, d: DocumentData): Message {
  return {
    id,
    threadId,
    senderUid: d.senderUid ?? '',
    text: d.text ?? '',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  };
}

export class FirebaseMessagingBackend implements MessagingBackend {
  readonly isShared = true;
  private get db(): Firestore {
    return getDb();
  }

  subscribeThreads(uid: string, cb: (threads: Thread[]) => void): Unsubscribe {
    // No orderBy (avoids a composite index); sort client-side.
    return onSnapshot(query(collection(this.db, 'threads'), where('participants', 'array-contains', uid)), (s) =>
      cb(sortThreads(s.docs.map((d) => toThread(d.id, d.data())))),
    );
  }

  subscribeMessages(threadId: string, cb: (messages: Message[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, 'threads', threadId, 'messages'), orderBy('createdAt', 'asc'), limit(MSG_LIMIT)),
      (s) => cb(s.docs.map((m) => toMessage(m.id, threadId, m.data()))),
    );
  }

  async ensureThread(a: ChatPartner, b: ChatPartner): Promise<string> {
    const id = threadIdFor(a.uid, b.uid);
    const ref = doc(this.db, 'threads', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, newThread(a, b));
    return id;
  }

  async sendMessage(threadId: string, sender: ChatPartner, text: string): Promise<void> {
    const now = Date.now();
    const batch = writeBatch(this.db);
    batch.set(doc(collection(this.db, 'threads', threadId, 'messages')), {
      senderUid: sender.uid,
      text: text.trim(),
      createdAt: now,
      serverAt: serverTimestamp(),
    });
    batch.update(doc(this.db, 'threads', threadId), { lastText: text.trim(), lastAt: now, lastSenderUid: sender.uid });
    await batch.commit();
  }

  async markRead(threadId: string, uid: string): Promise<void> {
    await updateDoc(doc(this.db, 'threads', threadId), { [`readAt.${uid}`]: Date.now() });
  }

  async deleteMyData(uid: string): Promise<void> {
    const mine = await getDocs(query(collection(this.db, 'threads'), where('participants', 'array-contains', uid)));
    for (const t of mine.docs) {
      const msgs = await getDocs(collection(this.db, 'threads', t.id, 'messages'));
      for (const m of msgs.docs) await deleteDoc(m.ref);
      await deleteDoc(t.ref);
    }
  }
}
