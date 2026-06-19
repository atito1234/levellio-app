import type { AppNotification, NotificationDraft } from '@/lib/notifications';

export type Unsubscribe = () => void;

/**
 * Stores a user's inbox. Mirrors the community/profile seam: an interface with a
 * Local (on-device) and Firebase (cross-device) implementation. The ACTOR writes
 * into the RECIPIENT's inbox via `add`.
 */
export interface NotificationsBackend {
  readonly isShared: boolean;
  /** Live subscription to my inbox (newest first). */
  subscribe(uid: string, cb: (items: AppNotification[]) => void): Unsubscribe;
  /** Append a notification to the recipient's inbox. */
  add(draft: NotificationDraft): Promise<void>;
  /** Mark all of my notifications read. */
  markAllRead(uid: string): Promise<void>;
  /** Remove my inbox (account deletion). */
  deleteMyData(uid: string): Promise<void>;
}
