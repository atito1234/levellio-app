import { InMemoryStore } from '@/services/storage';
import { LocalAccountService } from './LocalAccountService';

describe('LocalAccountService', () => {
  it('signs up, persists a session, then deleteAccount removes the user + session', async () => {
    const svc = new LocalAccountService(new InMemoryStore());
    await svc.signUp('a@b.com', 'secret123', 'Ada');
    expect(svc.current()?.email).toBe('a@b.com');

    await svc.deleteAccount();
    expect(svc.current()).toBeNull();

    // The account is gone — signing back in with the old credentials fails.
    await expect(svc.signIn('a@b.com', 'secret123')).rejects.toBeTruthy();
  });

  it('reauthenticate is a no-op for the local fallback', async () => {
    const svc = new LocalAccountService(new InMemoryStore());
    await svc.signUp('c@d.com', 'secret123', 'Cy');
    await expect(svc.reauthenticate('whatever')).resolves.toBeUndefined();
  });
});
