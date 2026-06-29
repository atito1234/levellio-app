import { shouldIntervene, type AbandonContext } from './intervention';

const ctx = (over: Partial<AbandonContext> & Pick<AbandonContext, 'kind'>): AbandonContext => ({ ...over });

describe('shouldIntervene', () => {
  it('pauses a battle retreat only while the timer runs', () => {
    expect(shouldIntervene(ctx({ kind: 'battle-retreat', battleRunning: true }))).toBe(true);
    expect(shouldIntervene(ctx({ kind: 'battle-retreat', battleRunning: false }))).toBe(false);
  });

  it('pauses closing the War Room only with missions selected', () => {
    expect(shouldIntervene(ctx({ kind: 'setup-close', selectedCount: 2 }))).toBe(true);
    expect(shouldIntervene(ctx({ kind: 'setup-close', selectedCount: 0 }))).toBe(false);
  });

  it('protects a real streak on un-plan / delete (>= 2 days)', () => {
    expect(shouldIntervene(ctx({ kind: 'unplan', streakDays: 3 }))).toBe(true);
    expect(shouldIntervene(ctx({ kind: 'unplan', streakDays: 1 }))).toBe(false);
    expect(shouldIntervene(ctx({ kind: 'quest-delete', streakDays: 5 }))).toBe(true);
    expect(shouldIntervene(ctx({ kind: 'quest-delete', streakDays: 0 }))).toBe(false);
  });

  it('never nags on a low-stakes ripple back', () => {
    expect(shouldIntervene(ctx({ kind: 'ripple-back', streakDays: 99 }))).toBe(false);
  });

  it('pauses a locked-activity exit only while the lock is engaged', () => {
    expect(shouldIntervene(ctx({ kind: 'activity-locked-exit', focusLockedRunning: true }))).toBe(true);
    expect(shouldIntervene(ctx({ kind: 'activity-locked-exit', focusLockedRunning: false }))).toBe(false);
  });
});
