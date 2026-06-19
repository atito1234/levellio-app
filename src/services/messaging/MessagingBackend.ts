import type { ChatPartner, Message, Thread } from '@/lib/messaging';

export type Unsubscribe = () => void;

/** 1:1 text messaging store. Mirrors the community/profile/stories seam. */
export interface MessagingBackend {
  readonly isShared: boolean;
  /** My conversation list (live). */
  subscribeThreads(uid: string, cb: (threads: Thread[]) => void): Unsubscribe;
  /** Messages in one thread (live, oldest first). */
  subscribeMessages(threadId: string, cb: (messages: Message[]) => void): Unsubscribe;
  /** Create the thread if it doesn't exist; returns its id. */
  ensureThread(a: ChatPartner, b: ChatPartner): Promise<string>;
  /** Append a message and bump the thread's last-message fields. */
  sendMessage(threadId: string, sender: ChatPartner, text: string): Promise<void>;
  /** Mark the thread read for a user (now). */
  markRead(threadId: string, uid: string): Promise<void>;
  /** Remove the user's threads + messages (account deletion). */
  deleteMyData(uid: string): Promise<void>;
}
