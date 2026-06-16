/**
 * Local persistence for explicit activity links (the user's "chains"). On-device
 * only (KeyValueStore seam); maps to a future users/{uid}/activityLinks doc.
 */
import type { KeyValueStore } from '@/services/storage';
import { normalizeLinks, type LinkMap } from '@/lib/links';

export const LINK_SCHEMA_VERSION = 1;

const NS = 'levellio';
const linksKey = (uid: string) => `${NS}:links:${uid}`;

export class LinkStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<LinkMap> {
    const raw = await this.store.getItem(linksKey(uid));
    if (!raw) return {};
    try {
      return normalizeLinks(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  async save(uid: string, links: LinkMap): Promise<void> {
    await this.store.setItem(linksKey(uid), JSON.stringify({ schema: LINK_SCHEMA_VERSION, links }));
  }
}
