import { MockAuthService } from './MockAuthService';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

describe('MockAuthService', () => {
  it('has no current user initially', async () => {
    const auth = new MockAuthService(new InMemoryStore());
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it('signs in anonymously and persists the session', async () => {
    const store = new InMemoryStore();
    const auth = new MockAuthService(store);
    const user = await auth.signInAnonymously();
    expect(user.isAnonymous).toBe(true);

    // A fresh instance over the same store still sees the user (survives restart).
    const restarted = new MockAuthService(store);
    expect((await restarted.getCurrentUser())?.uid).toBe(user.uid);
  });

  it('returns the same user on repeated anonymous sign-in', async () => {
    const auth = new MockAuthService(new InMemoryStore());
    const a = await auth.signInAnonymously();
    const b = await auth.signInAnonymously();
    expect(a.uid).toBe(b.uid);
  });

  it('signs out', async () => {
    const auth = new MockAuthService(new InMemoryStore());
    await auth.signInAnonymously();
    await auth.signOut();
    expect(await auth.getCurrentUser()).toBeNull();
  });
});
