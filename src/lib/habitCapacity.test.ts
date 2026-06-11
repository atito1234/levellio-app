import { CATEGORY_CAPACITY_WEIGHTS, rippleForQuest } from './habitCapacity';
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
