/**
 * Direct messaging — pure types + helpers (no I/O). 1:1 text threads. A thread id
 * is derived deterministically from the two participant uids, so both sides resolve
 * the same conversation without a lookup.
 */
import type { HeroPresentation } from '@/types';
import { screenText } from './contentSafety';

export const MAX_MESSAGE_TEXT = 1000;

export interface ChatPartner {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
}

export interface Thread {
  id: string;
  participants: string[];
  names: Record<string, string>;
  presentations: Record<string, HeroPresentation>;
  lastText: string;
  lastAt: number;
  lastSenderUid: string;
  /** Per-participant "last read at" timestamps (for unread detection). */
  readAt: Record<string, number>;
}

export interface Message {
  id: string;
  threadId: string;
  senderUid: string;
  text: string;
  createdAt: number;
}

/** Deterministic, order-independent thread id for two users. */
export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join('__');
}

export function isValidMessageText(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_MESSAGE_TEXT && screenText(t).ok;
}

export function otherParticipant(thread: Pick<Thread, 'participants'>, myUid: string): string {
  return thread.participants.find((u) => u !== myUid) ?? myUid;
}

export function otherName(thread: Thread, myUid: string): string {
  return thread.names[otherParticipant(thread, myUid)] ?? 'Hero';
}

/** Unread = there's a last message, it wasn't mine, and it's newer than my read mark. */
export function isUnread(thread: Pick<Thread, 'lastAt' | 'lastSenderUid' | 'readAt'>, myUid: string): boolean {
  if (!thread.lastAt || thread.lastSenderUid === myUid) return false;
  return thread.lastAt > (thread.readAt[myUid] ?? 0);
}

export function unreadThreadCount(threads: readonly Thread[], myUid: string): number {
  return threads.reduce((n, th) => (isUnread(th, myUid) ? n + 1 : n), 0);
}

export function sortThreads(threads: readonly Thread[]): Thread[] {
  return [...threads].sort((a, b) => b.lastAt - a.lastAt);
}

export function sortMessages(msgs: readonly Message[]): Message[] {
  return [...msgs].sort((a, b) => a.createdAt - b.createdAt);
}

/** Build a fresh thread between two partners (no messages yet). */
export function newThread(a: ChatPartner, b: ChatPartner): Thread {
  const presentations: Record<string, HeroPresentation> = {};
  if (a.presentation) presentations[a.uid] = a.presentation;
  if (b.presentation) presentations[b.uid] = b.presentation;
  return {
    id: threadIdFor(a.uid, b.uid),
    participants: [a.uid, b.uid].sort(),
    names: { [a.uid]: a.displayName, [b.uid]: b.displayName },
    presentations,
    lastText: '',
    lastAt: 0,
    lastSenderUid: '',
    readAt: {},
  };
}
