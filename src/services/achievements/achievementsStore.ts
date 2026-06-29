/**
 * Local persistence for which achievements the user has already "seen" (so we can
 * highlight newly-unlocked ones later). On-device only, per-uid. Tiny: a string[].
 */
import { AsyncStorageStore, type KeyValueStore } from '@/services/storage';

const seenKey = (uid: string) => `levellio:achievements:seen:${uid}`;

export class AchievementsStore {
  constructor(private readonly store: KeyValueStore) {}

  async loadSeen(uid: string): Promise<string[]> {
    const raw = await this.store.getItem(seenKey(uid));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  async saveSeen(uid: string, ids: readonly string[]): Promise<void> {
    await this.store.setItem(seenKey(uid), JSON.stringify([...new Set(ids)]));
  }
}

export const achievementsStore = new AchievementsStore(new AsyncStorageStore());
