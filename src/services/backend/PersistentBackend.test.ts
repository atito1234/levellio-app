import { PersistentBackend } from './PersistentBackend';
import { migrateCharacter, migrateQuests } from './migrations';
import { LOCAL_UID, seedCharacter } from './seed';
import { InMemoryStore } from '@/services/storage/InMemoryStore';
import type { Character } from '@/types';

describe('PersistentBackend', () => {
  it('returns empty state when nothing is stored', async () => {
    const backend = new PersistentBackend(new InMemoryStore());
    expect(await backend.getCurrentUser()).toBeNull();
    expect(await backend.loadCharacter(LOCAL_UID)).toBeNull();
    expect(await backend.loadQuests(LOCAL_UID)).toEqual([]);
  });

  it('seeds and persists on first anonymous sign-in', async () => {
    const backend = new PersistentBackend(new InMemoryStore());
    const user = await backend.signInAnonymously();
    expect(user.uid).toBe(LOCAL_UID);
    expect(await backend.loadCharacter(LOCAL_UID)).not.toBeNull();
    expect((await backend.loadQuests(LOCAL_UID)).length).toBeGreaterThan(0);
  });

  it('does not re-seed or wipe progress on repeated sign-in', async () => {
    const store = new InMemoryStore();
    const backend = new PersistentBackend(store);
    await backend.signInAnonymously();

    const progressed: Character = { ...seedCharacter(LOCAL_UID), level: 5, xp: 120, streakDays: 4 };
    await backend.saveCharacter(LOCAL_UID, progressed);

    await backend.signInAnonymously(); // sign in again
    const loaded = await backend.loadCharacter(LOCAL_UID);
    expect(loaded?.level).toBe(5);
    expect(loaded?.xp).toBe(120);
    expect(loaded?.streakDays).toBe(4);
  });

  it('round-trips character and quests through save/load', async () => {
    const backend = new PersistentBackend(new InMemoryStore());
    const character: Character = {
      ...seedCharacter(LOCAL_UID),
      level: 3,
      xp: 42,
      streakDays: 2,
      lastCompletionDate: '2026-06-10',
      tier: 'novice',
    };
    await backend.saveCharacter(LOCAL_UID, character);
    await backend.saveQuests(LOCAL_UID, [
      { id: 'a', title: 'Read', category: 'habit', difficulty: 'easy', baseXp: 20, completed: true },
    ]);

    expect(await backend.loadCharacter(LOCAL_UID)).toEqual(character);
    const quests = await backend.loadQuests(LOCAL_UID);
    expect(quests).toHaveLength(1);
    expect(quests[0]?.completed).toBe(true);
  });

  it('persists across a simulated app restart (new instance, same store)', async () => {
    const store = new InMemoryStore();
    const first = new PersistentBackend(store);
    await first.signInAnonymously();
    await first.saveCharacter(LOCAL_UID, { ...seedCharacter(LOCAL_UID), level: 9 });

    const afterRestart = new PersistentBackend(store);
    expect((await afterRestart.loadCharacter(LOCAL_UID))?.level).toBe(9);
  });

  it('migrates a legacy character record missing newer fields', async () => {
    const store = new InMemoryStore();
    // Legacy blob: no streakDays, no lastCompletionDate, no tier/companion.
    await store.setItem(
      'levellio:character:local-hero',
      JSON.stringify({ id: 'local-hero', name: 'Hero', presentation: 'female', level: 8, xp: 10 }),
    );
    const backend = new PersistentBackend(store);
    const loaded = await backend.loadCharacter(LOCAL_UID);
    expect(loaded?.streakDays).toBe(0);
    expect(loaded?.lastCompletionDate).toBeUndefined();
    expect(loaded?.tier).toBe('pathfinder'); // re-derived from level 8
    expect(loaded?.companionStage).toBe('ember');
  });

  it('survives corrupt JSON without throwing', async () => {
    const store = new InMemoryStore();
    await store.setItem('levellio:character:local-hero', '{not valid json');
    const backend = new PersistentBackend(store);
    expect(await backend.loadCharacter(LOCAL_UID)).toBeNull();
  });
});

describe('migrations', () => {
  it('migrateCharacter fills defaults and re-derives tier/companion', () => {
    const c = migrateCharacter({ level: 20, xp: 5 });
    expect(c.tier).toBe('luminary');
    expect(c.companionStage).toBe('phoenixling');
    expect(c.presentation).toBe('neutral');
    expect(c.streakDays).toBe(0);
  });

  it('migrateCharacter clamps invalid numbers', () => {
    const c = migrateCharacter({ level: -3, xp: -10, streakDays: -1 });
    expect(c.level).toBe(1);
    expect(c.xp).toBe(0);
    expect(c.streakDays).toBe(0);
  });

  it('migrateQuests returns [] for non-array input and fills defaults', () => {
    expect(migrateQuests(null)).toEqual([]);
    const quests = migrateQuests([{ title: 'X' }]);
    expect(quests[0]?.difficulty).toBe('easy');
    expect(quests[0]?.baseXp).toBe(20);
    expect(quests[0]?.completed).toBe(false);
  });
});
