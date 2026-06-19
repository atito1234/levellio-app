import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalNotificationsBackend } from './LocalNotificationsBackend';
import type { NotificationsBackend } from './NotificationsBackend';

/**
 * Active notifications backend. Firestore when configured; on-device otherwise.
 * The Firestore impl is required lazily so its graph never loads when unused.
 */
function build(): NotificationsBackend {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseNotificationsBackend } = require('./FirebaseNotificationsBackend') as typeof import('./FirebaseNotificationsBackend');
    return new FirebaseNotificationsBackend();
  }
  return new LocalNotificationsBackend(new AsyncStorageStore());
}

export const notificationsBackend: NotificationsBackend = build();
export type { NotificationsBackend, Unsubscribe } from './NotificationsBackend';
