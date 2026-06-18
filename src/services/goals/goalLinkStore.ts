/**
 * Local persistence for explicit habit→goal membership (per-uid). On-device only
 * (KeyValueStore seam) — this mapping is personal to the user.
 */
import type { KeyValueStore } from '@/services/storage';
import { normalizeGoalLinks, type GoalLinks } from '@/lib/goalLinks';

const linksKey = (uid: string) => `levellio:goalLinks:${uid}`;

export class GoalLinkStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<GoalLinks> {
    const raw = await this.store.getItem(linksKey(uid));
    if (!raw) return {};
    try {
      return normalizeGoalLinks(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  async save(uid: string, links: GoalLinks): Promise<void> {
    await this.store.setItem(linksKey(uid), JSON.stringify({ links }));
  }
}
