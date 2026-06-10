/**
 * Local mock auth. Persists the current (anonymous) user via the KeyValueStore
 * so sessions survive restarts. Stands in for Firebase Auth until it's wired.
 */
import type { KeyValueStore } from '@/services/storage';
import type { AuthService, AuthUser } from './AuthService';

const AUTH_KEY = 'levellio:auth:user';
const ANON_UID = 'local-hero';

export class MockAuthService implements AuthService {
  constructor(private readonly store: KeyValueStore) {}

  async getCurrentUser(): Promise<AuthUser | null> {
    const raw = await this.store.getItem(AUTH_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  async signInAnonymously(): Promise<AuthUser> {
    const existing = await this.getCurrentUser();
    if (existing) return existing;
    const user: AuthUser = { uid: ANON_UID, isAnonymous: true };
    await this.store.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  }

  async signOut(): Promise<void> {
    await this.store.removeItem(AUTH_KEY);
  }
}
