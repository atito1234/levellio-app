import { AsyncStorageStore } from '@/services/storage';
import { isFirebaseConfigured } from '@/services/firebase/config';
import { LocalStoriesBackend } from './LocalStoriesBackend';
import type { StoriesBackend } from './StoriesBackend';

function build(): StoriesBackend {
  if (isFirebaseConfigured()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FirebaseStoriesBackend } = require('./FirebaseStoriesBackend') as typeof import('./FirebaseStoriesBackend');
    return new FirebaseStoriesBackend();
  }
  return new LocalStoriesBackend(new AsyncStorageStore());
}

export const storiesBackend: StoriesBackend = build();
export type { StoriesBackend, Unsubscribe } from './StoriesBackend';
