import type { KeyValueStore } from '@/services/storage';
import { sortNewest, type AppNotification, type NotificationDraft } from '@/lib/notifications';
import type { NotificationsBackend, Unsubscribe } from './NotificationsBackend';

const KEY = (uid: string) => `levellio:notifications:${uid}`;
const MAX = 100;

/** On-device inbox (single-device). Keeps in-memory subscribers for live updates. */
export class LocalNotificationsBackend implements NotificationsBackend {
  readonly isShared = false;
  private readonly subs = new Map<string, Set<(items: AppNotification[]) => void>>();

  constructor(private readonly store: KeyValueStore) {}

  private async read(uid: string): Promise<AppNotification[]> {
    const raw = await this.store.getItem(KEY(uid));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as AppNotification[];
    } catch {
      return [];
    }
  }

  private async write(uid: string, items: AppNotification[]): Promise<void> {
    const next = sortNewest(items).slice(0, MAX);
    await this.store.setItem(KEY(uid), JSON.stringify(next));
    for (const cb of this.subs.get(uid) ?? []) cb(next);
  }

  subscribe(uid: string, cb: (items: AppNotification[]) => void): Unsubscribe {
    let set = this.subs.get(uid);
    if (!set) {
      set = new Set();
      this.subs.set(uid, set);
    }
    set.add(cb);
    void this.read(uid).then((items) => cb(sortNewest(items)));
    return () => {
      this.subs.get(uid)?.delete(cb);
    };
  }

  async add(draft: NotificationDraft): Promise<void> {
    const items = await this.read(draft.recipientUid);
    const notif: AppNotification = { ...draft, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, read: false };
    await this.write(draft.recipientUid, [notif, ...items]);
  }

  async markAllRead(uid: string): Promise<void> {
    const items = await this.read(uid);
    if (items.every((n) => n.read)) return;
    await this.write(uid, items.map((n) => ({ ...n, read: true })));
  }

  async deleteMyData(uid: string): Promise<void> {
    await this.store.removeItem(KEY(uid));
    for (const cb of this.subs.get(uid) ?? []) cb([]);
  }
}
