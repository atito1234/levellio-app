import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalAccountService } from './LocalAccountService';
import type { AccountService } from './AccountService';

/**
 * Active account service. Real Firebase Auth when configured; a local on-device
 * fallback otherwise (so the flow works offline until keys are added). The
 * Firebase service is imported lazily so its `firebase/auth` graph never loads
 * when it isn't needed.
 */
function build(): AccountService {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseAccountService } = require('./FirebaseAccountService') as typeof import('./FirebaseAccountService');
    return new FirebaseAccountService();
  }
  return new LocalAccountService(new AsyncStorageStore());
}

export const accountService: AccountService = build();

export type { Account, AccountService } from './AccountService';
export { describeAuthError } from './AccountService';
export { AuthCodeError } from './LocalAccountService';
