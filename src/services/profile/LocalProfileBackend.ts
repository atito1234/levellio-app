import type { KeyValueStore } from '@/services/storage';
import type { PublicProfile } from '@/lib/profile';
import type { ProfileBackend, Unsubscribe } from './ProfileBackend';

const KEY = (uid: string) => `levellio:profile:${uid}`;

/**
 * On-device profile store (single-device). Keeps in-memory subscribers so the
 * viewer's own profile updates live when they level up / earn a milestone.
 */
export class LocalProfileBackend implements ProfileBackend {
  readonly isShared = false;
  private readonly subs = new Map<string, Set<(p: PublicProfile | null) => void>>();

  constructor(private readonly store: KeyValueStore) {}

  async publishProfile(profile: PublicProfile): Promise<void> {
    await this.store.setItem(KEY(profile.uid), JSON.stringify(profile));
    this.emit(profile.uid, profile);
  }

  async getProfile(uid: string): Promise<PublicProfile | null> {
    const raw = await this.store.getItem(KEY(uid));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PublicProfile;
    } catch {
      return null;
    }
  }

  subscribeProfile(uid: string, cb: (p: PublicProfile | null) => void): Unsubscribe {
    let set = this.subs.get(uid);
    if (!set) {
      set = new Set();
      this.subs.set(uid, set);
    }
    set.add(cb);
    void this.getProfile(uid).then(cb);
    return () => {
      this.subs.get(uid)?.delete(cb);
    };
  }

  async deleteMyData(uid: string): Promise<void> {
    await this.store.removeItem(KEY(uid));
    this.emit(uid, null);
  }

  private emit(uid: string, profile: PublicProfile | null): void {
    for (const cb of this.subs.get(uid) ?? []) cb(profile);
  }
}
