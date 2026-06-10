import { getByoApiKey, setByoApiKey, clearByoApiKey } from './secureKeyStore';
import { InMemorySecretStore } from './InMemorySecretStore';

describe('BYO key secure storage', () => {
  it('returns null when no key is stored', async () => {
    const store = new InMemorySecretStore();
    expect(await getByoApiKey(store)).toBeNull();
  });

  it('saves and reads back a key', async () => {
    const store = new InMemorySecretStore();
    await setByoApiKey('sk-secret-123', store);
    expect(await getByoApiKey(store)).toBe('sk-secret-123');
  });

  it('clears a stored key', async () => {
    const store = new InMemorySecretStore();
    await setByoApiKey('sk-secret-123', store);
    await clearByoApiKey(store);
    expect(await getByoApiKey(store)).toBeNull();
  });
});
