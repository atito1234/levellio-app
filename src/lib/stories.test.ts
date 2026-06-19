import { activeStories, groupByUser, isExpired, makeExpiry, STORY_TTL_MS, type Story } from './stories';

function story(over: Partial<Story> = {}): Story {
  const createdAt = over.createdAt ?? 1000;
  return {
    id: 's',
    uid: 'alice',
    displayName: 'Ada',
    media: { url: 'u', type: 'image' },
    createdAt,
    expiresAt: makeExpiry(createdAt),
    ...over,
  };
}

describe('expiry', () => {
  it('makeExpiry adds the TTL', () => {
    expect(makeExpiry(1000)).toBe(1000 + STORY_TTL_MS);
  });
  it('isExpired is true at/after expiry', () => {
    const s = story({ createdAt: 0 });
    expect(isExpired(s, STORY_TTL_MS - 1)).toBe(false);
    expect(isExpired(s, STORY_TTL_MS)).toBe(true);
  });
});

describe('activeStories', () => {
  it('drops expired and sorts newest first', () => {
    const now = 10 * STORY_TTL_MS;
    const fresh = story({ id: 'a', createdAt: now - 1000 });
    const old = story({ id: 'b', createdAt: now - 2 * STORY_TTL_MS });
    const newer = story({ id: 'c', createdAt: now - 500 });
    expect(activeStories([fresh, old, newer], now).map((s) => s.id)).toEqual(['c', 'a']);
  });
});

describe('groupByUser', () => {
  const now = 5 * STORY_TTL_MS;
  it('groups per user, newest group first', () => {
    const a1 = story({ id: 'a1', uid: 'alice', createdAt: now - 3000 });
    const b1 = story({ id: 'b1', uid: 'bob', createdAt: now - 1000 });
    const groups = groupByUser([a1, b1], now);
    expect(groups.map((g) => g.uid)).toEqual(['bob', 'alice']);
  });
  it('puts my own group first', () => {
    const a1 = story({ id: 'a1', uid: 'alice', createdAt: now - 3000 });
    const b1 = story({ id: 'b1', uid: 'bob', createdAt: now - 1000 });
    const groups = groupByUser([a1, b1], now, 'alice');
    expect(groups[0]!.uid).toBe('alice');
  });
});
