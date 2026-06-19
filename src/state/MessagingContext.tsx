import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messagingBackend } from '@/services/messaging';
import {
  unreadThreadCount,
  type ChatPartner,
  type Message,
  type Thread,
} from '@/lib/messaging';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';

/** Owns my conversation list + the send/open/read actions. Requires sign-in. */
interface MessagingContextValue {
  threads: Thread[];
  unreadCount: number;
  myUid: string | null;
  openThreadWith: (partner: ChatPartner) => Promise<string | null>;
  subscribeMessages: (threadId: string, cb: (messages: Message[]) => void) => () => void;
  send: (threadId: string, text: string) => Promise<void>;
  markRead: (threadId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;
  const [threads, setThreads] = useState<Thread[]>([]);

  const me = useMemo<ChatPartner | null>(() => {
    if (!uid) return null;
    return {
      uid,
      displayName: account?.displayName?.trim() || character?.name?.trim() || 'Hero',
      ...(character?.presentation ? { presentation: character.presentation } : {}),
    };
  }, [uid, account?.displayName, character?.name, character?.presentation]);

  useEffect(() => {
    if (!uid) {
      setThreads([]);
      return;
    }
    const unsub = messagingBackend.subscribeThreads(uid, setThreads);
    return unsub;
  }, [uid]);

  const openThreadWith = useCallback(
    async (partner: ChatPartner) => {
      if (!me) return null;
      return messagingBackend.ensureThread(me, partner);
    },
    [me],
  );

  const subscribeMessages = useCallback(
    (threadId: string, cb: (messages: Message[]) => void) => messagingBackend.subscribeMessages(threadId, cb),
    [],
  );

  const send = useCallback(
    async (threadId: string, text: string) => {
      if (me) await messagingBackend.sendMessage(threadId, me, text);
    },
    [me],
  );

  const markRead = useCallback(
    async (threadId: string) => {
      if (uid) await messagingBackend.markRead(threadId, uid);
    },
    [uid],
  );

  const value = useMemo<MessagingContextValue>(
    () => ({
      threads,
      unreadCount: uid ? unreadThreadCount(threads, uid) : 0,
      myUid: uid,
      openThreadWith,
      subscribeMessages,
      send,
      markRead,
    }),
    [threads, uid, openThreadWith, subscribeMessages, send, markRead],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging(): MessagingContextValue {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within a MessagingProvider');
  return ctx;
}
