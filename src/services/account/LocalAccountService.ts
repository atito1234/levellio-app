/**
 * Local fallback for AccountService when Firebase isn't configured. Keeps the
 * sign-in flow working fully offline (single-device): credentials are stored on
 * the device only, so projects can be explored and tested without a backend.
 * NOT secure auth — it's a stand-in until Firebase keys are added.
 */
import type { KeyValueStore } from '@/services/storage';
import type { Account, AccountService } from './AccountService';

const SESSION_KEY = 'levellio:account:session';
const usersKey = 'levellio:account:users';

interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  password: string;
}

/** Stable, non-cryptographic uid from an email (local fallback only). */
function uidFor(email: string): string {
  let hash = 0;
  const norm = email.trim().toLowerCase();
  for (let i = 0; i < norm.length; i += 1) hash = (hash * 31 + norm.charCodeAt(i)) | 0;
  return `local-${(hash >>> 0).toString(36)}`;
}

export class LocalAccountService implements AccountService {
  readonly isReal = false;
  private currentAccount: Account | null = null;
  private subscribers = new Set<(a: Account | null) => void>();

  constructor(private readonly store: KeyValueStore) {}

  current(): Account | null {
    return this.currentAccount;
  }

  onChange(cb: (account: Account | null) => void): () => void {
    this.subscribers.add(cb);
    void this.restore().then(() => cb(this.currentAccount));
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private emit(): void {
    this.subscribers.forEach((cb) => cb(this.currentAccount));
  }

  private async restore(): Promise<void> {
    if (this.currentAccount) return;
    const raw = await this.store.getItem(SESSION_KEY);
    if (raw) {
      try {
        this.currentAccount = JSON.parse(raw) as Account;
      } catch {
        this.currentAccount = null;
      }
    }
  }

  private async users(): Promise<StoredUser[]> {
    const raw = await this.store.getItem(usersKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredUser[];
    } catch {
      return [];
    }
  }

  private async setSession(account: Account): Promise<Account> {
    this.currentAccount = account;
    await this.store.setItem(SESSION_KEY, JSON.stringify(account));
    this.emit();
    return account;
  }

  async signUp(email: string, password: string, displayName: string): Promise<Account> {
    const users = await this.users();
    const norm = email.trim().toLowerCase();
    if (users.some((u) => u.email === norm)) {
      throw new AuthCodeError('auth/email-already-in-use');
    }
    if (password.length < 6) throw new AuthCodeError('auth/weak-password');
    const user: StoredUser = { uid: uidFor(norm), email: norm, displayName: displayName.trim(), password };
    await this.store.setItem(usersKey, JSON.stringify([...users, user]));
    return this.setSession({ uid: user.uid, email: user.email, displayName: user.displayName });
  }

  async signIn(email: string, password: string): Promise<Account> {
    const norm = email.trim().toLowerCase();
    const user = (await this.users()).find((u) => u.email === norm);
    if (!user || user.password !== password) throw new AuthCodeError('auth/invalid-credential');
    return this.setSession({ uid: user.uid, email: user.email, displayName: user.displayName });
  }

  async signOut(): Promise<void> {
    this.currentAccount = null;
    await this.store.removeItem(SESSION_KEY);
    this.emit();
  }

  async resetPassword(): Promise<void> {
    // No email delivery offline; this is a no-op stand-in.
  }

  async reauthenticate(_password: string): Promise<void> {
    // No re-verification needed for the local fallback.
  }

  async deleteAccount(): Promise<void> {
    const uid = this.currentAccount?.uid;
    if (uid) {
      const remaining = (await this.users()).filter((u) => u.uid !== uid);
      await this.store.setItem(usersKey, JSON.stringify(remaining));
    }
    this.currentAccount = null;
    await this.store.removeItem(SESSION_KEY);
    this.emit();
  }
}

/** Carries a Firebase-style `code` so describeAuthError works for both backends. */
export class AuthCodeError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'AuthCodeError';
  }
}
