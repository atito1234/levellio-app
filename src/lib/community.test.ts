import {
  isValidCommentText,
  isValidPostText,
  myReaction,
  postInScope,
  reactionCounts,
  reactionTotal,
  sortFeed,
  timeAgo,
  toggleReaction,
  topReactions,
  type Post,
} from './community';

function post(over: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    authorUid: 'alice',
    displayName: 'Alice',
    text: 'hi',
    kind: 'post',
    createdAt: 1000,
    reactions: {},
    commentCount: 0,
    ...over,
  };
}

describe('community reactions', () => {
  it('counts and totals a reaction map', () => {
    const r = { a: '👏', b: '👏', c: '🔥' } as const;
    expect(reactionCounts(r)).toEqual({ '👏': 2, '🔥': 1 });
    expect(reactionTotal(r)).toBe(3);
  });

  it('toggleReaction adds, switches, and clears', () => {
    let r: Record<string, '👏' | '🔥' | '💪' | '❤️'> = {};
    r = toggleReaction(r, 'alice', '👏');
    expect(myReaction(r, 'alice')).toBe('👏');
    r = toggleReaction(r, 'alice', '🔥'); // switch
    expect(myReaction(r, 'alice')).toBe('🔥');
    r = toggleReaction(r, 'alice', '🔥'); // tapping same clears
    expect(myReaction(r, 'alice')).toBeNull();
  });

  it('topReactions returns present emojis, most-used first', () => {
    const r = { a: '🔥', b: '🔥', c: '👏' } as const;
    expect(topReactions(r)).toEqual(['🔥', '👏']);
  });
});

describe('community validation', () => {
  it('rejects empty and over-long text', () => {
    expect(isValidPostText('  ')).toBe(false);
    expect(isValidPostText('ok')).toBe(true);
    expect(isValidPostText('x'.repeat(501))).toBe(false);
    expect(isValidCommentText('')).toBe(false);
    expect(isValidCommentText('nice')).toBe(true);
  });
});

describe('postInScope', () => {
  const following = new Set(['bob']);
  it('all → always true', () => {
    expect(postInScope(post({ authorUid: 'zed' }), 'all', following, 'me')).toBe(true);
  });
  it('network → me or people I follow', () => {
    expect(postInScope(post({ authorUid: 'me' }), 'network', following, 'me')).toBe(true);
    expect(postInScope(post({ authorUid: 'bob' }), 'network', following, 'me')).toBe(true);
    expect(postInScope(post({ authorUid: 'zed' }), 'network', following, 'me')).toBe(false);
  });
  it('project → matches projectId', () => {
    expect(postInScope(post({ projectId: 'g1' }), { projectId: 'g1' }, following, 'me')).toBe(true);
    expect(postInScope(post({ projectId: 'g2' }), { projectId: 'g1' }, following, 'me')).toBe(false);
  });
});

describe('feed ordering + time', () => {
  it('sorts newest first and bounds length', () => {
    const a = post({ id: 'a', createdAt: 1 });
    const b = post({ id: 'b', createdAt: 5 });
    expect(sortFeed([a, b]).map((p) => p.id)).toEqual(['b', 'a']);
    expect(sortFeed([a, b], 1)).toHaveLength(1);
  });
  it('timeAgo renders compact labels', () => {
    const now = 10_000_000;
    expect(timeAgo(now, now)).toBe('just now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5m');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3h');
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2d');
  });
});
