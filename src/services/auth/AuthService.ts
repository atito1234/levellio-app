/**
 * Authentication abstraction. Firebase Auth is the planned provider, but the
 * app depends only on this interface. A local mock implements it today; a
 * FirebaseAuthService can swap in later with no caller changes.
 *
 * STUB STATUS: no real Firebase project / package id yet.
 */
export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
  displayName?: string;
  email?: string;
}

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signInAnonymously(): Promise<AuthUser>;
  signOut(): Promise<void>;
}
