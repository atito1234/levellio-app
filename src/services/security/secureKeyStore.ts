/**
 * Secure storage for the user's bring-your-own AI key.
 *
 * SECURITY: keys are entered by the user at runtime and stored ONLY in the
 * platform secure enclave / keystore via expo-secure-store. They are never
 * committed, never logged, and never written to plaintext storage.
 */
import * as SecureStore from 'expo-secure-store';

export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const BYO_KEY = 'levellio.byo_api_key';

/** expo-secure-store-backed secret store (production). */
export class ExpoSecretStore implements SecretStore {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
}

const defaultStore: SecretStore = new ExpoSecretStore();

export async function getByoApiKey(store: SecretStore = defaultStore): Promise<string | null> {
  return store.get(BYO_KEY);
}

export async function setByoApiKey(value: string, store: SecretStore = defaultStore): Promise<void> {
  await store.set(BYO_KEY, value);
}

export async function clearByoApiKey(store: SecretStore = defaultStore): Promise<void> {
  await store.remove(BYO_KEY);
}
