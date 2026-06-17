/**
 * Local persistence for which habits feed which projects (per-uid). On-device
 * only (KeyValueStore seam) — these links are personal to the member.
 */
import type { KeyValueStore } from '@/services/storage';
import { normalizeLinks, type ProjectLinks } from '@/lib/projectLinks';

const linksKey = (uid: string) => `levellio:projectLinks:${uid}`;

export class ProjectLinkStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<ProjectLinks> {
    const raw = await this.store.getItem(linksKey(uid));
    if (!raw) return {};
    try {
      return normalizeLinks(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  async save(uid: string, links: ProjectLinks): Promise<void> {
    await this.store.setItem(linksKey(uid), JSON.stringify({ links }));
  }
}
