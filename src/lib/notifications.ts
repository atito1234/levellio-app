/**
 * In-app notifications — pure types + helpers (no I/O). A notification is written
 * by the ACTOR into the RECIPIENT's inbox when they react to / comment on a post,
 * or follow them. Tappable back to the post or the actor's profile.
 */
import type { HeroPresentation } from '@/types';

export type NotificationType = 'reaction' | 'comment' | 'follow';

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  actorUid: string;
  actorName: string;
  actorPresentation?: HeroPresentation;
  /** For reaction/comment notifications: the post involved. */
  postId?: string;
  /** For reaction notifications: which emoji. */
  emoji?: string;
  createdAt: number;
  read: boolean;
}

/** A notification before the backend assigns an id + read flag. */
export type NotificationDraft = Omit<AppNotification, 'id' | 'read'>;

export interface NotificationActor {
  uid: string;
  name: string;
  presentation?: HeroPresentation;
}

/** Never notify yourself, and never without a recipient. */
export function shouldNotify(actorUid: string, recipientUid: string | undefined | null): boolean {
  return Boolean(recipientUid) && actorUid !== recipientUid;
}

function base(actor: NotificationActor, recipientUid: string, type: NotificationType, now: number): NotificationDraft {
  return {
    recipientUid,
    type,
    actorUid: actor.uid,
    actorName: actor.name,
    ...(actor.presentation ? { actorPresentation: actor.presentation } : {}),
    createdAt: now,
  };
}

export function reactionDraft(actor: NotificationActor, recipientUid: string, postId: string, emoji: string, now = Date.now()): NotificationDraft {
  return { ...base(actor, recipientUid, 'reaction', now), postId, emoji };
}

export function commentDraft(actor: NotificationActor, recipientUid: string, postId: string, now = Date.now()): NotificationDraft {
  return { ...base(actor, recipientUid, 'comment', now), postId };
}

export function followDraft(actor: NotificationActor, recipientUid: string, now = Date.now()): NotificationDraft {
  return base(actor, recipientUid, 'follow', now);
}

export function unreadCount(items: readonly AppNotification[]): number {
  return items.reduce((n, x) => (x.read ? n : n + 1), 0);
}

export function sortNewest(items: readonly AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

export type RecencyBucket = 'today' | 'week' | 'earlier';

/** Bucket a timestamp relative to `now` for grouped display. */
export function recencyBucket(ts: number, now = Date.now()): RecencyBucket {
  const day = 24 * 60 * 60 * 1000;
  const age = now - ts;
  if (age < day) return 'today';
  if (age < 7 * day) return 'week';
  return 'earlier';
}

/** Group notifications (newest first) into today / this week / earlier. */
export function groupByRecency(
  items: readonly AppNotification[],
  now = Date.now(),
): Record<RecencyBucket, AppNotification[]> {
  const out: Record<RecencyBucket, AppNotification[]> = { today: [], week: [], earlier: [] };
  for (const n of sortNewest(items)) out[recencyBucket(n.createdAt, now)].push(n);
  return out;
}
