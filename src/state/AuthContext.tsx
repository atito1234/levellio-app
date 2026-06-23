import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { accountService, describeAuthError, type Account } from '@/services/account';
import { projectsBackend } from '@/services/projects';
import { communityBackend } from '@/services/community';
import { profileBackend } from '@/services/profile';
import { notificationsBackend } from '@/services/notifications';
import { storiesBackend } from '@/services/stories';
import { messagingBackend } from '@/services/messaging';

interface AuthContextValue {
  /** False until the first auth-state resolution. */
  ready: boolean;
  account: Account | null;
  /** True when backed by real, cross-device Firebase Auth. */
  isReal: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** One-tap providers. Return `{ ok:false, error:'unavailable' }` until OAuth is wired. */
  signInWithApple: () => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Permanently delete the account: purge the user's community + project data,
   * then delete the auth user. `password` re-verifies if the session is old.
   */
  deleteAccount: (password?: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function errorOf(e: unknown): string {
  const code = (e as { code?: string })?.code;
  return describeAuthError(code ?? '');
}

/** Owns the signed-in account for the collaborative (Projects) layer. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = accountService.onChange((next) => {
      setAccount(next);
      setReady(true);
    });
    return unsub;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      await accountService.signUp(email, password, displayName);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorOf(e) };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await accountService.signIn(email, password);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorOf(e) };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!accountService.signInWithApple) return { ok: false, error: 'unavailable' };
    try {
      await accountService.signInWithApple();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorOf(e) };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!accountService.signInWithGoogle) return { ok: false, error: 'unavailable' };
    try {
      await accountService.signInWithGoogle();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorOf(e) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await accountService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await accountService.resetPassword(email);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorOf(e) };
    }
  }, []);

  const deleteAccount = useCallback(
    async (password?: string) => {
      const uid = account?.uid ?? null;
      try {
        // Purge the user's shared data FIRST (while still authenticated, so the
        // rules permit it), then delete the auth account.
        if (uid) {
          await Promise.allSettled([
            communityBackend.deleteMyData(uid),
            projectsBackend.deleteMyData(uid),
            profileBackend.deleteMyData(uid),
            notificationsBackend.deleteMyData(uid),
            storiesBackend.deleteMyData(uid),
            messagingBackend.deleteMyData(uid),
          ]);
        }
        await accountService.deleteAccount(password);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorOf(e) };
      }
    },
    [account],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ready, account, isReal: accountService.isReal, signUp, signIn, signInWithApple, signInWithGoogle, signOut, resetPassword, deleteAccount }),
    [ready, account, signUp, signIn, signInWithApple, signInWithGoogle, signOut, resetPassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
