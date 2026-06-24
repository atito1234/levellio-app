import type { KeyValueStore } from './KeyValueStore';

/**
 * In-memory KeyValueStore. Used in tests and as a safe fallback if a native
 * store is unavailable. State lives only for the process lifetime.
 */
export class InMemoryStore implements KeyValueStore {
  private map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.map.keys()];
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      this.map.clear();
      return;
    }
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }
}
