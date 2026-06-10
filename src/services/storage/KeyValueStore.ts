/**
 * Minimal async key/value storage seam. Backends depend on this interface, not
 * on a concrete storage engine, so AsyncStorage (or anything else) can be
 * swapped without touching callers — and tests use an in-memory store.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
