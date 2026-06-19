import {
  isUnread,
  isValidMessageText,
  newThread,
  otherParticipant,
  sortMessages,
  sortThreads,
  threadIdFor,
  unreadThreadCount,
  type Thread,
} from './messaging';

const alice = { uid: 'alice', displayName: 'Ada', presentation: 'female' as const };
const bob = { uid: 'bob', displayName: 'Bo' };

function thread(over: Partial<Thread> = {}): Thread {
  return { ...newThread(alice, bob), ...over };
}

describe('threadIdFor', () => {
  it('is deterministic and order-independent', () => {
    expect(threadIdFor('alice', 'bob')).toBe(threadIdFor('bob', 'alice'));
    expect(threadIdFor('alice', 'bob')).toBe('alice__bob');
  });
});

describe('isValidMessageText', () => {
  it('rejects empty/whitespace, accepts normal text', () => {
    expect(isValidMessageText('   ')).toBe(false);
    expect(isValidMessageText('hi')).toBe(true);
  });
});

describe('newThread', () => {
  it('sorts participants and records names/presentations', () => {
    const th = newThread(alice, bob);
    expect(th.participants).toEqual(['alice', 'bob']);
    expect(th.names).toEqual({ alice: 'Ada', bob: 'Bo' });
    expect(th.presentations).toEqual({ alice: 'female' });
  });
});

describe('otherParticipant', () => {
  it('returns the non-me participant', () => {
    expect(otherParticipant(thread(), 'alice')).toBe('bob');
  });
});

describe('isUnread / unreadThreadCount', () => {
  it('is unread when the last message is theirs and newer than my read mark', () => {
    const th = thread({ lastAt: 100, lastSenderUid: 'bob', readAt: { alice: 50 } });
    expect(isUnread(th, 'alice')).toBe(true);
    expect(isUnread(th, 'bob')).toBe(false); // my own message
  });
  it('is read once my read mark catches up', () => {
    const th = thread({ lastAt: 100, lastSenderUid: 'bob', readAt: { alice: 100 } });
    expect(isUnread(th, 'alice')).toBe(false);
  });
  it('counts unread threads', () => {
    const a = thread({ id: 't1', lastAt: 100, lastSenderUid: 'bob', readAt: {} });
    const b = thread({ id: 't2', lastAt: 0 });
    expect(unreadThreadCount([a, b], 'alice')).toBe(1);
  });
});

describe('sorting', () => {
  it('threads newest activity first', () => {
    const a = thread({ id: 'a', lastAt: 1 });
    const b = thread({ id: 'b', lastAt: 3 });
    expect(sortThreads([a, b]).map((t) => t.id)).toEqual(['b', 'a']);
  });
  it('messages oldest first', () => {
    const m = (id: string, createdAt: number) => ({ id, threadId: 't', senderUid: 'x', text: 'y', createdAt });
    expect(sortMessages([m('b', 3), m('a', 1)]).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
