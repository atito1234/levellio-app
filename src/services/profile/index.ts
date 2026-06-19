import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalProfileBackend } from './LocalProfileBackend';
import type { ProfileBackend } from './ProfileBackend';

/**
 * Active profile backend. Firestore (cross-device) when Firebase is configured;
 * the on-device store otherwise. The Firestore impl is required lazily so its
 * graph never loads when unused.
 */
function build(): ProfileBackend {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseProfileBackend } = require('./FirebaseProfileBackend') as typeof import('./FirebaseProfileBackend');
    return new FirebaseProfileBackend();
  }
  return new LocalProfileBackend(new AsyncStorageStore());
}

export const profileBackend: ProfileBackend = build();
export type { ProfileBackend, Unsubscribe } from './ProfileBackend';
