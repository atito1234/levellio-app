import {
  ACHIEVEMENT_GOLD,
  ACTION_CAPACITY_LINKS,
  ACTIONS,
  applyRipple,
  CAPACITIES,
  CAPACITY_HEX,
  capacitiesForAction,
  capacityLevels,
  emptyLevels,
  getCapacity,
  ringColor,
  ripple,
  WEIGHT_VALUE,
  type CapacityId,
} from './compounding';

describe('capacity model', () => {
  it('seeds the six capacities with unique ids/order and locked hues', () => {
    expect(CAPACITIES).toHaveLength(6);
    const ids = CAPACITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(6);
    expect([...CAPACITIES].map((c) => c.order).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const c of CAPACITIES) expect(c.colorId === 'violet' || c.colorId === 'teal').toBe(true);
  });

  it('falls back for an unknown capacity id', () => {
    expect(getCapacity('nope' as CapacityId).id).toBe(CAPACITIES[0]!.id);
  });
});

describe('action -> capacity links', () => {
  it('feeds every capacity at least once (no empty capacities)', () => {
    const fed = new Set(ACTION_CAPACITY_LINKS.map((l) => l.capacityId));
    for (const c of CAPACITIES) expect(fed.has(c.id)).toBe(true);
  });

  it('only links real actions and capacities', () => {
    const actionIds = new Set(ACTIONS.map((a) => a.id));
    const capIds = new Set(CAPACITIES.map((c) => c.id));
    for (const l of ACTION_CAPACITY_LINKS) {
      expect(actionIds.has(l.actionId)).toBe(true);
      expect(capIds.has(l.capacityId)).toBe(true);
    }
  });

  it('every action feeds multiple capacities', () => {
    for (const a of ACTIONS) {
      expect(capacitiesForAction(a.id).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('ripple()', () => {
  it('returns the capacity deltas for water, strongest first, weights respected', () => {
    const deltas = ripple('water');
    expect(deltas).toEqual([
      { capacityId: 'hydration', weight: 'Strong', delta: WEIGHT_VALUE.Strong },
      { capacityId: 'energy', weight: 'Medium', delta: WEIGHT_VALUE.Medium },
      { capacityId: 'endurance', weight: 'Light', delta: WEIGHT_VALUE.Light },
    ]);
    // Iconic example: many rings move from one action.
    expect(deltas.map((d) => d.delta)).toEqual([8, 4, 2]);
    expect(deltas).toHaveLength(3);
  });

  it('orders ties by capacity order', () => {
    const deltas = ripple('walk'); // endurance Strong, energy Medium, calm Light, focus Light
    expect(deltas[0]).toMatchObject({ capacityId: 'endurance' });
    // calm (order 3) before focus (order 4) when both are Light.
    const light = deltas.filter((d) => d.weight === 'Light').map((d) => d.capacityId);
    expect(light).toEqual(['calm', 'focus']);
  });

  it('is empty for an unknown action', () => {
    expect(ripple('nope')).toEqual([]);
  });
});

describe('capacity levels', () => {
  it('applies one ripple, clamped 0-100', () => {
    const after = applyRipple(emptyLevels(), 'water');
    expect(after.hydration).toBe(8);
    expect(after.energy).toBe(4);
    expect(after.endurance).toBe(2);
    expect(after.sleep).toBe(0);
  });

  it('accumulates many completions and never exceeds 100', () => {
    const many = Array.from({ length: 40 }, () => 'water');
    const levels = capacityLevels(many);
    expect(levels.hydration).toBe(100); // 40*8 clamped
    expect(levels.sleep).toBe(0);
  });

  it('derives levels from a mixed log', () => {
    const levels = capacityLevels(['water', 'walk', 'breathe']);
    // energy: water 4 + walk 4 + breathe 2 = 10
    expect(levels.energy).toBe(10);
    expect(levels.calm).toBe(WEIGHT_VALUE.Light + WEIGHT_VALUE.Strong); // walk Light + breathe Strong
  });
});

describe('ring color', () => {
  it('uses the capacity hue for a partial ring and gold only at 100%', () => {
    expect(ringColor(40, 'teal')).toBe(CAPACITY_HEX.teal);
    expect(ringColor(99, 'violet')).toBe(CAPACITY_HEX.violet);
    expect(ringColor(100, 'violet')).toBe(ACHIEVEMENT_GOLD);
  });
});
