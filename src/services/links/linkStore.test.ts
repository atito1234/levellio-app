import { LinkStore } from './linkStore';
import { addLink } from '@/lib/links';
import type { KeyValueStore } from '@/services/storage';

class InMemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  async getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  async removeItem(k: string) {
    this.map.delete(k);
  }
  async getAllKeys() {
    return [...this.map.keys()];
  }
  async clear(prefix?: string) {
    for (const k of [...this.map.keys()]) {
      if (!prefix || k.startsWith(prefix)) this.map.delete(k);
    }
  }
}

describe('LinkStore', () => {
  it('round-trips a link map and normalizes on load', async () => {
    const store = new LinkStore(new InMemoryStore());
    const links = addLink(addLink({}, 'a', 'b'), 'b', 'c');
    await store.save('u1', links);
    const loaded = await store.load('u1');
    expect(loaded.a).toEqual(['b']);
    expect(loaded.b).toEqual(['a', 'c']);
  });

  it('returns an empty map for an unknown user or bad data', async () => {
    const store = new LinkStore(new InMemoryStore());
    expect(await store.load('nobody')).toEqual({});
  });
});
