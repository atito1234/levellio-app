import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalCommunityBackend } from './LocalCommunityBackend';
import type { CommunityBackend } from './CommunityBackend';

/**
 * Active community backend. Firestore (cross-device realtime) when Firebase is
 * configured; the local on-device backend otherwise — so the feature works and
 * is testable today. The Firestore backend is required lazily so its
 * `firebase/firestore` graph never loads when it isn't used.
 */
function build(): CommunityBackend {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseCommunityBackend } = require('./FirebaseCommunityBackend') as typeof import('./FirebaseCommunityBackend');
    return new FirebaseCommunityBackend();
  }
  return new LocalCommunityBackend(new AsyncStorageStore());
}

export const communityBackend: CommunityBackend = build();
export type { CommunityBackend, Unsubscribe } from './CommunityBackend';
