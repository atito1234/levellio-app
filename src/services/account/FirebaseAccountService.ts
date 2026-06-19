/**
 * Firebase Auth implementation of AccountService (email/password). Real,
 * recoverable, cross-device accounts. Only constructed when Firebase is
 * configured (see ./index).
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase/app';
import type { Account, AccountService } from './AccountService';

function toAccount(user: User): Account {
  return {
    uid: user.uid,
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
  };
}

export class FirebaseAccountService implements AccountService {
  readonly isReal = true;
  private currentAccount: Account | null = null;

  current(): Account | null {
    return this.currentAccount;
  }

  onChange(cb: (account: Account | null) => void): () => void {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      this.currentAccount = user ? toAccount(user) : null;
      cb(this.currentAccount);
    });
  }

  async signUp(email: string, password: string, displayName: string): Promise<Account> {
    const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    if (displayName.trim()) await updateProfile(user, { displayName: displayName.trim() });
    this.currentAccount = toAccount(user);
    return this.currentAccount;
  }

  async signIn(email: string, password: string): Promise<Account> {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    this.currentAccount = toAccount(user);
    return this.currentAccount;
  }

  async signOut(): Promise<void> {
    await fbSignOut(getFirebaseAuth());
    this.currentAccount = null;
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
  }

  async reauthenticate(password: string): Promise<void> {
    const user = getFirebaseAuth().currentUser;
    if (!user || !user.email) return;
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  }

  async deleteAccount(password?: string): Promise<void> {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    try {
      await deleteUser(user);
    } catch (e) {
      // Firebase requires a recent login before deletion — re-verify and retry.
      if ((e as { code?: string }).code === 'auth/requires-recent-login' && password && user.email) {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        await deleteUser(user);
      } else {
        throw e;
      }
    }
    this.currentAccount = null;
  }
}
