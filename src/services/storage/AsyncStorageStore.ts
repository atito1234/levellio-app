import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from './KeyValueStore';

/**
 * Device-backed KeyValueStore using AsyncStorage. This is the production store
 * for non-sensitive game state (character, quests). Secrets (e.g. BYO API keys)
 * must NOT go here — use the secure key store instead.
 */
export class AsyncStorageStore implements KeyValueStore {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...(await AsyncStorage.getAllKeys())];
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      await AsyncStorage.clear();
      return;
    }
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  }
}
