/**
 * Jest mock for the native expo-secure-store module so logic that statically
 * imports it can run in the Node test environment. Tests that exercise key
 * storage use InMemorySecretStore directly, so these are inert no-ops.
 */
export async function getItemAsync(): Promise<string | null> {
  return null;
}

export async function setItemAsync(): Promise<void> {
  // no-op
}

export async function deleteItemAsync(): Promise<void> {
  // no-op
}
