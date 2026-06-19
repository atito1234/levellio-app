import type { KeyValueStore } from '@/services/storage';
import {
  newThread,
  sortMessages,
  sortThreads,
  threadIdFor,
  type ChatPartner,
  type Message,
  type Thread,
} from '@/lib/messaging';
import type { MessagingBackend, Unsubscribe } from './MessagingBackend';

const THREADS_KEY = 'levellio:threads';
const MSGS_KEY = (threadId: string) => `levellio:messages:${threadId}`;

/** On-device messaging (single-device). Useful for tests + offline; cross-device needs Firebase. */
export class LocalMessagingBackend implements MessagingBackend {
  readonly isShared = false;
  private readonly threadSubs = new Set<(threads: Thread[]) => void>();
  private readonly msgSubs = new Map<string, Set<(m: Message[]) => void>>();

  constructor(private readonly store: KeyValueStore) {}

  private async readThreads(): Promise<Thread[]> {
    const raw = await this.store.getItem(THREADS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Thread[];
    } catch {
      return [];
    }
  }

  private async writeThreads(threads: Thread[]): Promise<void> {
    await this.store.setItem(THREADS_KEY, JSON.stringify(threads));
    for (const cb of this.threadSubs) cb(sortThreads(threads));
  }

  private async readMsgs(threadId: string): Promise<Message[]> {
    const raw = await this.store.getItem(MSGS_KEY(threadId));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Message[];
    } catch {
      return [];
    }
  }

  private async writeMsgs(threadId: string, msgs: Message[]): Promise<void> {
    const sorted = sortMessages(msgs);
    await this.store.setItem(MSGS_KEY(threadId), JSON.stringify(sorted));
    for (const cb of this.msgSubs.get(threadId) ?? []) cb(sorted);
  }

  subscribeThreads(uid: string, cb: (threads: Thread[]) => void): Unsubscribe {
    const filtered = (threads: Thread[]) => cb(sortThreads(threads.filter((t) => t.participants.includes(uid))));
    this.threadSubs.add(filtered);
    void this.readThreads().then(filtered);
    return () => {
      this.threadSubs.delete(filtered);
    };
  }

  subscribeMessages(threadId: string, cb: (messages: Message[]) => void): Unsubscribe {
    let set = this.msgSubs.get(threadId);
    if (!set) {
      set = new Set();
      this.msgSubs.set(threadId, set);
    }
    set.add(cb);
    void this.readMsgs(threadId).then((m) => cb(sortMessages(m)));
    return () => {
      this.msgSubs.get(threadId)?.delete(cb);
    };
  }

  async ensureThread(a: ChatPartner, b: ChatPartner): Promise<string> {
    const id = threadIdFor(a.uid, b.uid);
    const threads = await this.readThreads();
    if (!threads.some((t) => t.id === id)) {
      await this.writeThreads([newThread(a, b), ...threads]);
    }
    return id;
  }

  async sendMessage(threadId: string, sender: ChatPartner, text: string): Promise<void> {
    const now = Date.now();
    const msgs = await this.readMsgs(threadId);
    const msg: Message = { id: `m_${now}_${Math.random().toString(36).slice(2, 8)}`, threadId, senderUid: sender.uid, text: text.trim(), createdAt: now };
    await this.writeMsgs(threadId, [...msgs, msg]);
    const threads = await this.readThreads();
    await this.writeThreads(
      threads.map((t) => (t.id === threadId ? { ...t, lastText: msg.text, lastAt: now, lastSenderUid: sender.uid } : t)),
    );
  }

  async markRead(threadId: string, uid: string): Promise<void> {
    const threads = await this.readThreads();
    await this.writeThreads(
      threads.map((t) => (t.id === threadId ? { ...t, readAt: { ...t.readAt, [uid]: Date.now() } } : t)),
    );
  }

  async deleteMyData(uid: string): Promise<void> {
    const threads = await this.readThreads();
    const mine = threads.filter((t) => t.participants.includes(uid));
    for (const t of mine) await this.store.removeItem(MSGS_KEY(t.id));
    await this.writeThreads(threads.filter((t) => !t.participants.includes(uid)));
  }
}
