import {
  commentDraft,
  followDraft,
  groupByRecency,
  reactionDraft,
  recencyBucket,
  shouldNotify,
  sortNewest,
  unreadCount,
  type AppNotification,
} from './notifications';

const actor = { uid: 'alice', name: 'Ada', presentation: 'female' as const };

function notif(over: Partial<AppNotification> = {}): AppNotification {
  return { id: 'n1', recipientUid: 'bob', type: 'reaction', actorUid: 'alice', actorName: 'Ada', createdAt: 1, read: false, ...over };
}

describe('shouldNotify', () => {
  it('skips self and missing recipient', () => {
    expect(shouldNotify('alice', 'bob')).toBe(true);
    expect(shouldNotify('alice', 'alice')).toBe(false);
    expect(shouldNotify('alice', undefined)).toBe(false);
    expect(shouldNotify('alice', '')).toBe(false);
  });
});

describe('drafts', () => {
  it('builds a reaction draft with post + emoji', () => {
    const d = reactionDraft(actor, 'bob', 'p1', '🔥', 100);
    expect(d).toEqual({ recipientUid: 'bob', type: 'reaction', actorUid: 'alice', actorName: 'Ada', actorPresentation: 'female', postId: 'p1', emoji: '🔥', createdAt: 100 });
  });
  it('builds a comment draft', () => {
    expect(commentDraft(actor, 'bob', 'p1', 5).type).toBe('comment');
    expect(commentDraft(actor, 'bob', 'p1', 5).postId).toBe('p1');
  });
  it('builds a follow draft with no post', () => {
    const d = followDraft(actor, 'bob', 5);
    expect(d.type).toBe('follow');
    expect(d.postId).toBeUndefined();
  });
});

describe('counts + ordering', () => {
  it('counts unread', () => {
    expect(unreadCount([notif(), notif({ id: 'n2', read: true }), notif({ id: 'n3' })])).toBe(2);
  });
  it('sorts newest first', () => {
    const out = sortNewest([notif({ id: 'a', createdAt: 1 }), notif({ id: 'b', createdAt: 3 }), notif({ id: 'c', createdAt: 2 })]);
    expect(out.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('recency grouping', () => {
  const now = 10 * 24 * 60 * 60 * 1000; // day 10
  const day = 24 * 60 * 60 * 1000;
  it('buckets by age', () => {
    expect(recencyBucket(now - day / 2, now)).toBe('today');
    expect(recencyBucket(now - 3 * day, now)).toBe('week');
    expect(recencyBucket(now - 8 * day, now)).toBe('earlier');
  });
  it('groups newest-first within buckets', () => {
    const items = [
      notif({ id: 't1', createdAt: now - day / 4 }),
      notif({ id: 'w1', createdAt: now - 2 * day }),
      notif({ id: 'e1', createdAt: now - 9 * day }),
    ];
    const g = groupByRecency(items, now);
    expect(g.today.map((n) => n.id)).toEqual(['t1']);
    expect(g.week.map((n) => n.id)).toEqual(['w1']);
    expect(g.earlier.map((n) => n.id)).toEqual(['e1']);
  });
});
