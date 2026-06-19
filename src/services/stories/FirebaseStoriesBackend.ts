/**
 * Firestore StoriesBackend — cross-device ephemeral stories.
 *   stories/{id}   { uid, displayName, presentation?, media{url,type}, createdAt, expiresAt }
 * Active filtering is done client-side over the most-recent docs (cheap at alpha scale).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase/app';
import { activeStories, type Story, type StoryDraft } from '@/lib/stories';
import type { StoriesBackend, Unsubscribe } from './StoriesBackend';

const STORY_LIMIT = 100;

function toStory(id: string, d: DocumentData): Story {
  return {
    id,
    uid: d.uid ?? '',
    displayName: d.displayName ?? 'Hero',
    ...(d.presentation ? { presentation: d.presentation } : {}),
    media: d.media ?? { url: '', type: 'image' },
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    expiresAt: typeof d.expiresAt === 'number' ? d.expiresAt : 0,
  };
}

export class FirebaseStoriesBackend implements StoriesBackend {
  readonly isShared = true;
  private get db(): Firestore {
    return getDb();
  }

  subscribeActive(cb: (stories: Story[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(this.db, 'stories'), orderBy('createdAt', 'desc'), limit(STORY_LIMIT)),
      (s) => cb(activeStories(s.docs.map((d) => toStory(d.id, d.data())))),
    );
  }

  async addStory(draft: StoryDraft): Promise<void> {
    const ref = doc(collection(this.db, 'stories'));
    await setDoc(ref, draft);
  }

  async deleteMyData(uid: string): Promise<void> {
    const mine = await getDocs(query(collection(this.db, 'stories'), where('uid', '==', uid)));
    for (const d of mine.docs) await deleteDoc(d.ref);
  }
}
