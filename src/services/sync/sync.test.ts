import { mergeSnapshots, type GameSnapshot } from './SyncService';
import { MockSyncService } from './MockSyncService';
import type { Character, Quest } from '@/types';

function character(over: Partial<Character> = {}): Character {
  return {
    id: 'local-hero',
    name: 'Hero',
    presentation: 'neutral',
    level: 1,
    xp: 0,
    streakDays: 0,
    tier: 'novice',
    companionStage: 'spark',
    ...over,
  };
}

const quest = (id: string, completed = false): Quest => ({
  id,
  title: id,
  category: 'health',
  difficulty: 'easy',
  baseXp: 20,
  completed,
});

function snapshot(over: Partial<GameSnapshot> = {}): GameSnapshot {
  return { character: character(), quests: [], updatedAt: 0, ...over };
}

describe('mergeSnapshots', () => {
  it('keeps the more-progressed hero by lifetime XP', () => {
    const local = snapshot({ character: character({ level: 5, xp: 0 }) });
    const remote = snapshot({ character: character({ level: 2, xp: 0 }) });
    expect(mergeSnapshots(local, remote).character.level).toBe(5);
    expect(mergeSnapshots(remote, local).character.level).toBe(5);
  });

  it('breaks XP ties by streak', () => {
    const local = snapshot({ character: character({ level: 3, xp: 10, streakDays: 1 }) });
    const remote = snapshot({ character: character({ level: 3, xp: 10, streakDays: 6 }) });
    expect(mergeSnapshots(local, remote).character.streakDays).toBe(6);
  });

  it('unions quests and keeps completions from either side', () => {
    const local = snapshot({ quests: [quest('a', true), quest('b', false)] });
    const remote = snapshot({ quests: [quest('b', true), quest('c', false)] });
    const merged = mergeSnapshots(local, remote);
    const byId = Object.fromEntries(merged.quests.map((q) => [q.id, q.completed]));
    expect(byId).toEqual({ a: true, b: true, c: false });
  });

  it('takes the latest updatedAt', () => {
    expect(mergeSnapshots(snapshot({ updatedAt: 10 }), snapshot({ updatedAt: 30 })).updatedAt).toBe(
      30,
    );
  });
});

describe('MockSyncService', () => {
  it('pulls null before anything is pushed', async () => {
    expect(await new MockSyncService().pull()).toBeNull();
  });

  it('push then pull returns stored remote', async () => {
    const sync = new MockSyncService();
    const snap = snapshot({ character: character({ level: 4 }) });
    await sync.push(snap);
    expect((await sync.pull())?.character.level).toBe(4);
  });

  it('sync merges local with remote and persists the result', async () => {
    const sync = new MockSyncService();
    await sync.push(snapshot({ quests: [quest('a', true)] }));
    const merged = await sync.sync(snapshot({ quests: [quest('b', false)] }));
    expect(merged.quests.map((q) => q.id).sort()).toEqual(['a', 'b']);
    expect((await sync.pull())?.quests.length).toBe(2);
  });
});
