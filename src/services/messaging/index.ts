import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalMessagingBackend } from './LocalMessagingBackend';
import type { MessagingBackend } from './MessagingBackend';

function build(): MessagingBackend {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseMessagingBackend } = require('./FirebaseMessagingBackend') as typeof import('./FirebaseMessagingBackend');
    return new FirebaseMessagingBackend();
  }
  return new LocalMessagingBackend(new AsyncStorageStore());
}

export const messagingBackend: MessagingBackend = build();
export type { MessagingBackend, Unsubscribe } from './MessagingBackend';
