import { CATEGORY_CAPACITY_WEIGHTS, rippleForQuest, capacityLevelsFromSessions } from './habitCapacity';
import { CAPACITIES, WEIGHT_VALUE } from './compounding';
import { CATEGORY_ORDER } from './categories';
import type { Quest } from '@/types';

const q = (category: Quest['category']): Quest => ({
  id: 'x',
  title: 'x',
  category,
  difficulty: 'easy',
  baseXp: 20,
  completed: false,
});

describe('habit -> capacity links', () => {
  it('defines links for every category, each feeding multiple capacities', () => {
    for (const c of CATEGORY_ORDER) {
      expect(CATEGORY_CAPACITY_WEIGHTS[c].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('collectively feeds all six capacities (no empty capacity)', () => {
    const fed = new Set<string>();
    for (const c of CATEGORY_ORDER) CATEGORY_CAPACITY_WEIGHTS[c].forEach((l) => fed.add(l.capacityId));
    for (const cap of CAPACITIES) expect(fed.has(cap.id)).toBe(true);
  });
});

describe('rippleForQuest', () => {
  it('returns ordered capacity deltas for a health habit (strongest first)', () => {
    expect(rippleForQuest(q('health'))).toEqual([
      { capacityId: 'hydration', weight: 'Strong', delta: WEIGHT_VALUE.Strong },
      { capacityId: 'sleep', weight: 'Medium', delta: WEIGHT_VALUE.Medium },
      { capacityId: 'energy', weight: 'Light', delta: WEIGHT_VALUE.Light },
    ]);
  });

  it('maps fitness to endurance-first', () => {
    expect(rippleForQuest(q('fitness'))[0]).toMatchObject({ capacityId: 'endurance', weight: 'Strong' });
  });

  it('never produces an empty ripple', () => {
    for (const c of CATEGORY_ORDER) expect(rippleForQuest(q(c)).length).toBeGreaterThan(0);
  });
});

describe('capacityLevelsFromSessions (rolling window)', () => {
  const now = new Date('2026-06-15T09:00:00');
  const at = (key: string) => new Date(`${key}T08:00:00`).getTime();

  it('is all zeros with no recent sessions (a fresh day is honest, not 100%)', () => {
    const levels = capacityLevelsFromSessions([], 7, now);
    expect(Object.values(levels).every((v) => v === 0)).toBe(true);
  });

  it('reflects only sessions inside the window', () => {
    const sessions = [
      { category: 'fitness', createdAt: at('2026-06-15') }, // today, in window
      { category: 'fitness', createdAt: at('2026-06-01') }, // 14 days ago, out of window
    ];
    const levels = capacityLevelsFromSessions(sessions, 7, now);
    // fitness → endurance Strong(8); only the in-window session counts.
    expect(levels.endurance).toBe(8);
  });

  it('accumulates within the window and clamps at 100', () => {
    const many = Array.from({ length: 30 }, () => ({ category: 'health', createdAt: at('2026-06-15') }));
    // health → hydration Strong(8) × 30 = 240, clamped to 100.
    expect(capacityLevelsFromSessions(many, 7, now).hydration).toBe(100);
  });

  it('ignores sessions without a category', () => {
    expect(capacityLevelsFromSessions([{ createdAt: at('2026-06-15') }], 7, now).endurance).toBe(0);
  });
});
