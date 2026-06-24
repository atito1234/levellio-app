/**
 * Minimal async key/value storage seam. Backends depend on this interface, not
 * on a concrete storage engine, so AsyncStorage (or anything else) can be
 * swapped without touching callers — and tests use an in-memory store.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** All known keys (used by namespaced bulk operations like reset). */
  getAllKeys(): Promise<string[]>;
  /**
   * Remove every key, or — when a prefix is given — only keys starting with it.
   * Used by the "start over" reset, which clears just the app's `levellio:`
   * namespace so unrelated entries on the device survive.
   */
  clear(prefix?: string): Promise<void>;
}
