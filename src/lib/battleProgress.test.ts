import { recordDragonVictory, dragonStreakOf, buyUnlock, canAfford, ownsUnlock } from './battleProgress';
import { EMPTY_BATTLE_PROGRESS, type BattleProgress } from '@/services/battles';

const base = (): BattleProgress => ({ ...EMPTY_BATTLE_PROGRESS, perDragon: {}, perDragonStreak: {}, ownedUnlocks: [] });

describe('recordDragonVictory', () => {
  it('increments totals, per-dragon count, coins, and starts a day-streak', () => {
    const p = recordDragonVictory(base(), 'fear', new Date('2026-01-01T10:00:00'), { coinsEarned: 35 });
    expect(p.totalSlain).toBe(1);
    expect(p.perDragon.fear).toBe(1);
    expect(p.coins).toBe(35);
    expect(dragonStreakOf(p, 'fear')).toBe(1);
  });

  it('extends a dragon’s streak on the next day, resets after a gap', () => {
    let p = recordDragonVictory(base(), 'fear', new Date('2026-01-01T10:00:00'));
    p = recordDragonVictory(p, 'fear', new Date('2026-01-02T09:00:00'));
    expect(dragonStreakOf(p, 'fear')).toBe(2);
    p = recordDragonVictory(p, 'fear', new Date('2026-01-05T09:00:00')); // missed days
    expect(dragonStreakOf(p, 'fear')).toBe(1);
  });

  it('counts a prep rite only when prepared', () => {
    let p = recordDragonVictory(base(), 'doubt', new Date('2026-01-01T10:00:00'), { prepared: true });
    expect(p.ritesPerformed).toBe(1);
    p = recordDragonVictory(p, 'doubt', new Date('2026-01-02T10:00:00'));
    expect(p.ritesPerformed).toBe(1);
  });
});

describe('unlocks', () => {
  it('buys when affordable and not owned; deducts coins', () => {
    const p = { ...base(), coins: 200 };
    const next = buyUnlock(p, 'wisp-aura-violet', 100);
    expect(next).not.toBeNull();
    expect(next!.coins).toBe(100);
    expect(ownsUnlock(next!, 'wisp-aura-violet')).toBe(true);
  });

  it('refuses when too poor or already owned', () => {
    expect(buyUnlock({ ...base(), coins: 50 }, 'x', 100)).toBeNull();
    expect(canAfford({ ...base(), coins: 50 }, 100)).toBe(false);
    const owned = { ...base(), coins: 500, ownedUnlocks: ['x'] };
    expect(buyUnlock(owned, 'x', 100)).toBeNull();
  });
});
