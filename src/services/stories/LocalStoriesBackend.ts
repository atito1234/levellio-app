import type { KeyValueStore } from '@/services/storage';
import { activeStories, type Story, type StoryDraft } from '@/lib/stories';
import type { StoriesBackend, Unsubscribe } from './StoriesBackend';

const KEY = 'levellio:stories';

/** On-device stories (single-device). Prunes expired entries on every read. */
export class LocalStoriesBackend implements StoriesBackend {
  readonly isShared = false;
  private readonly subs = new Set<(stories: Story[]) => void>();

  constructor(private readonly store: KeyValueStore) {}

  private async readAll(): Promise<Story[]> {
    const raw = await this.store.getItem(KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Story[];
    } catch {
      return [];
    }
  }

  private async writeAll(list: Story[]): Promise<void> {
    const active = activeStories(list);
    await this.store.setItem(KEY, JSON.stringify(active));
    for (const cb of this.subs) cb(active);
  }

  subscribeActive(cb: (stories: Story[]) => void): Unsubscribe {
    this.subs.add(cb);
    void this.readAll().then((list) => cb(activeStories(list)));
    return () => {
      this.subs.delete(cb);
    };
  }

  async addStory(draft: StoryDraft): Promise<void> {
    const list = await this.readAll();
    const story: Story = { ...draft, id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    await this.writeAll([story, ...list]);
  }

  async deleteMyData(uid: string): Promise<void> {
    const list = await this.readAll();
    await this.writeAll(list.filter((s) => s.uid !== uid));
  }
}
