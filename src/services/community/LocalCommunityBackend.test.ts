import { InMemoryStore } from '@/services/storage';
import { LocalCommunityBackend } from './LocalCommunityBackend';
import { myReaction, reactionTotal, type Comment, type Post } from '@/lib/community';

const ALICE = { uid: 'alice', displayName: 'Alice' };
const BOB = { uid: 'bob', displayName: 'Bob' };
const NONE = new Set<string>();

function nextFeed(b: LocalCommunityBackend, uid: string, following: Set<string>): Promise<Post[]> {
  return new Promise((resolve) => {
    const unsub = b.subscribeFeed('all', uid, following, (posts) => {
      unsub();
      resolve(posts);
    });
  });
}
function nextComments(b: LocalCommunityBackend, postId: string): Promise<Comment[]> {
  return new Promise((resolve) => {
    const unsub = b.subscribeComments(postId, (c) => {
      unsub();
      resolve(c);
    });
  });
}
function nextFollowing(b: LocalCommunityBackend, uid: string): Promise<string[]> {
  return new Promise((resolve) => {
    const unsub = b.subscribeFollowing(uid, (f) => {
      unsub();
      resolve(f);
    });
  });
}

describe('LocalCommunityBackend', () => {
  let b: LocalCommunityBackend;
  beforeEach(() => {
    b = new LocalCommunityBackend(new InMemoryStore());
  });

  it('creates posts and lists them newest-first', async () => {
    await b.createPost(ALICE, { text: 'first' });
    await b.createPost(BOB, { text: 'second' });
    const feed = await nextFeed(b, 'alice', NONE);
    expect(feed.map((p) => p.text)).toEqual(['second', 'first']);
  });

  it('reacts (one per user) and clears', async () => {
    const post = await b.createPost(ALICE, { text: 'hi' });
    await b.setReaction('bob', post.id, '🔥');
    await b.setReaction('carol', post.id, '🔥');
    let feed = await nextFeed(b, 'bob', NONE);
    expect(reactionTotal(feed[0]!.reactions)).toBe(2);
    expect(myReaction(feed[0]!.reactions, 'bob')).toBe('🔥');
    await b.setReaction('bob', post.id, null);
    feed = await nextFeed(b, 'bob', NONE);
    expect(reactionTotal(feed[0]!.reactions)).toBe(1);
    expect(myReaction(feed[0]!.reactions, 'bob')).toBeNull();
  });

  it('threads comments and bumps the count', async () => {
    const post = await b.createPost(ALICE, { text: 'hi' });
    await b.addComment(BOB, post.id, 'nice!');
    await b.addComment(ALICE, post.id, 'thanks');
    const comments = await nextComments(b, post.id);
    expect(comments.map((c) => c.text)).toEqual(['nice!', 'thanks']);
    const feed = await nextFeed(b, 'alice', NONE);
    expect(feed[0]!.commentCount).toBe(2);
  });

  it('network scope shows only me + people I follow', async () => {
    await b.createPost(ALICE, { text: 'from alice' });
    await b.createPost(BOB, { text: 'from bob' });
    const mineOnly = await new Promise<Post[]>((resolve) => {
      const unsub = b.subscribeFeed('network', 'me', new Set(['alice']), (p) => {
        unsub();
        resolve(p);
      });
    });
    expect(mineOnly.map((p) => p.text)).toEqual(['from alice']);
  });

  it('supports ask posts with an answer that attaches a suggested habit', async () => {
    const ask = await b.createPost(ALICE, { text: 'How do you keep water containers covered?', kind: 'ask', categoryHint: 'health' });
    expect(ask.kind).toBe('ask');
    expect(ask.categoryHint).toBe('health');
    await b.addComment(BOB, ask.id, 'This worked for me!', { title: 'Cover water containers', category: 'health', contribution: 1 });
    const comments = await nextComments(b, ask.id);
    expect(comments[0]!.suggestedHabit?.title).toBe('Cover water containers');
    expect(comments[0]!.suggestedHabit?.category).toBe('health');
  });

  it('deleteMyData removes my posts, comments, reactions, and follows', async () => {
    const mine = await b.createPost(ALICE, { text: 'my post' });
    const bobs = await b.createPost(BOB, { text: 'bob post' });
    await b.addComment(ALICE, bobs.id, 'nice, bob');
    await b.setReaction('alice', bobs.id, '🔥');
    await b.follow('alice', 'bob');

    await b.deleteMyData('alice');

    const feed = await nextFeed(b, 'observer', NONE);
    expect(feed.some((p) => p.id === mine.id)).toBe(false); // my post gone
    const bobPost = feed.find((p) => p.id === bobs.id)!;
    expect(myReaction(bobPost.reactions, 'alice')).toBeNull(); // my reaction stripped
    const comments = await nextComments(b, bobs.id);
    expect(comments.some((c) => c.uid === 'alice')).toBe(false); // my comment gone
    expect(await nextFollowing(b, 'alice')).toEqual([]);
  });

  it('follows and unfollows', async () => {
    await b.follow('me', 'alice');
    expect(await nextFollowing(b, 'me')).toEqual(['alice']);
    await b.unfollow('me', 'alice');
    expect(await nextFollowing(b, 'me')).toEqual([]);
    // Cannot follow yourself.
    await b.follow('me', 'me');
    expect(await nextFollowing(b, 'me')).toEqual([]);
  });
});
