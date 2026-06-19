/**
 * Account abstraction for the collaborative layer — real, recoverable accounts
 * (email/password) so a member is the same person across devices. Firebase Auth
 * backs it when configured; a local fallback keeps the flow working offline
 * (single-device) when it isn't. The rest of the app depends only on this.
 */
export interface Account {
  uid: string;
  email?: string;
  displayName?: string;
}

export interface AccountService {
  /** True when backed by real, cross-device Firebase Auth. */
  readonly isReal: boolean;
  /** Synchronously known current account (after the first onChange fires). */
  current(): Account | null;
  /** Subscribe to auth state; fires immediately with the current value. */
  onChange(cb: (account: Account | null) => void): () => void;
  signUp(email: string, password: string, displayName: string): Promise<Account>;
  signIn(email: string, password: string): Promise<Account>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  /** Re-verify the current user's password (for sensitive actions like deletion). */
  reauthenticate(password: string): Promise<void>;
  /**
   * Permanently delete the signed-in account. `password` is used to re-verify if
   * the session is too old (Firebase `auth/requires-recent-login`).
   */
  deleteAccount(password?: string): Promise<void>;
}

/** Human-readable error mapping shared by both implementations. */
export function describeAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email doesn’t look right.';
    case 'auth/email-already-in-use':
      return 'An account already exists for that email — try signing in.';
    case 'auth/weak-password':
      return 'Use a password of at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
