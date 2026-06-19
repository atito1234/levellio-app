import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationsBackend } from '@/services/notifications';
import {
  commentDraft,
  followDraft,
  reactionDraft,
  shouldNotify,
  unreadCount as countUnread,
  type AppNotification,
  type NotificationActor,
} from '@/lib/notifications';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import type { Post } from '@/lib/community';

/**
 * Owns the viewer's inbox + the emit helpers that write a notification to another
 * user when the viewer reacts/comments/follows. Emits are best-effort (errors are
 * swallowed) and never fire for self-actions.
 */
interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  notifyReaction: (post: Post, emoji: string) => void;
  notifyComment: (post: Post) => void;
  notifyFollow: (targetUid: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;
  const [items, setItems] = useState<AppNotification[]>([]);

  const actor = useMemo<NotificationActor | null>(() => {
    if (!uid) return null;
    return {
      uid,
      name: account?.displayName?.trim() || character?.name?.trim() || 'Hero',
      ...(character?.presentation ? { presentation: character.presentation } : {}),
    };
  }, [uid, account?.displayName, character?.name, character?.presentation]);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }
    const unsub = notificationsBackend.subscribe(uid, setItems);
    return unsub;
  }, [uid]);

  const markAllRead = useCallback(async () => {
    if (uid) await notificationsBackend.markAllRead(uid);
  }, [uid]);

  const emit = useCallback(
    (recipientUid: string, build: (a: NotificationActor) => Parameters<typeof notificationsBackend.add>[0]) => {
      if (!actor || !shouldNotify(actor.uid, recipientUid)) return;
      void notificationsBackend.add(build(actor)).catch(() => undefined);
    },
    [actor],
  );

  const notifyReaction = useCallback(
    (post: Post, emoji: string) => emit(post.authorUid, (a) => reactionDraft(a, post.authorUid, post.id, emoji)),
    [emit],
  );
  const notifyComment = useCallback(
    (post: Post) => emit(post.authorUid, (a) => commentDraft(a, post.authorUid, post.id)),
    [emit],
  );
  const notifyFollow = useCallback(
    (targetUid: string) => emit(targetUid, (a) => followDraft(a, targetUid)),
    [emit],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({ items, unreadCount: countUnread(items), markAllRead, notifyReaction, notifyComment, notifyFollow }),
    [items, markAllRead, notifyReaction, notifyComment, notifyFollow],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
