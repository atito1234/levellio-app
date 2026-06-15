import { BattleStore, normalizeBattleProgress } from './battleStore';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

describe('normalizeBattleProgress', () => {
  it('keeps valid counts and derives total when missing', () => {
    const p = normalizeBattleProgress({ perDragon: { laziness: 3, fear: 2 } });
    expect(p.totalSlain).toBe(5);
    expect(p.perDragon).toEqual({ laziness: 3, fear: 2 });
  });

  it('drops bad per-dragon values and bad technique ids', () => {
    const p = normalizeBattleProgress({ totalSlain: 4, perDragon: { x: -1, y: 'no', z: 2 }, lastTechniqueId: 'bogus' });
    expect(p.perDragon).toEqual({ z: 2 });
    expect(p.lastTechniqueId).toBeUndefined();
  });

  it('keeps a valid technique + custom minutes', () => {
    const p = normalizeBattleProgress({ lastTechniqueId: 'custom', lastCustomMin: 30 });
    expect(p.lastTechniqueId).toBe('custom');
    expect(p.lastCustomMin).toBe(30);
  });

  it('returns empty on garbage', () => {
    expect(normalizeBattleProgress(null)).toEqual({ totalSlain: 0, perDragon: {} });
  });
});

describe('BattleStore', () => {
  it('round-trips progression', async () => {
    const store = new BattleStore(new InMemoryStore());
    await store.save('u1', { totalSlain: 2, perDragon: { fear: 2 }, lastTechniqueId: 'pomodoro' });
    const out = await store.load('u1');
    expect(out.totalSlain).toBe(2);
    expect(out.perDragon.fear).toBe(2);
    expect(out.lastTechniqueId).toBe('pomodoro');
  });

  it('returns empty progress for a new user', async () => {
    expect(await new BattleStore(new InMemoryStore()).load('new')).toEqual({ totalSlain: 0, perDragon: {} });
  });
});
