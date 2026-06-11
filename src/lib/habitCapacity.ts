/**
 * Links the REAL habits (quests) to the compounding capacity model, so
 * completing any habit ripples into capacity rings — one unified system instead
 * of two. A habit's ripple is derived from its category (smart defaults, no
 * per-habit authoring), reusing the same weights/clamping as the action model.
 *
 * Pure + deterministic. Firebase-shaped: this map could later be overridden by
 * per-habit links stored alongside the quest.
 */
import { WEIGHT_VALUE, getCapacity, type CapacityDelta, type CapacityId, type LinkWeight } from './compounding';
import type { Quest, QuestCategory } from '@/types';

interface CapLink {
  capacityId: CapacityId;
  weight: LinkWeight;
}

/** Which capacities each habit category strengthens. Every capacity is fed. */
export const CATEGORY_CAPACITY_WEIGHTS: Record<QuestCategory, readonly CapLink[]> = {
  health: [
    { capacityId: 'hydration', weight: 'Strong' },
    { capacityId: 'sleep', weight: 'Medium' },
    { capacityId: 'energy', weight: 'Light' },
  ],
  fitness: [
    { capacityId: 'endurance', weight: 'Strong' },
    { capacityId: 'energy', weight: 'Medium' },
    { capacityId: 'calm', weight: 'Light' },
  ],
  mind: [
    { capacityId: 'calm', weight: 'Strong' },
    { capacityId: 'focus', weight: 'Medium' },
    { capacityId: 'sleep', weight: 'Light' },
  ],
  learning: [
    { capacityId: 'focus', weight: 'Strong' },
    { capacityId: 'energy', weight: 'Light' },
  ],
  productivity: [
    { capacityId: 'focus', weight: 'Strong' },
    { capacityId: 'energy', weight: 'Medium' },
  ],
  relationships: [
    { capacityId: 'calm', weight: 'Medium' },
    { capacityId: 'energy', weight: 'Light' },
  ],
  creativity: [
    { capacityId: 'focus', weight: 'Medium' },
    { capacityId: 'calm', weight: 'Light' },
  ],
  finance: [{ capacityId: 'focus', weight: 'Medium' }],
};

/**
 * The capacity ripple a habit produces when completed — the ordered list of
 * deltas (strongest first, ties by capacity order). Same shape as action ripple.
 */
export function rippleForQuest(quest: Pick<Quest, 'category'>): CapacityDelta[] {
  return CATEGORY_CAPACITY_WEIGHTS[quest.category]
    .map((l) => ({ capacityId: l.capacityId, weight: l.weight, delta: WEIGHT_VALUE[l.weight] }))
    .sort((a, b) => b.delta - a.delta || getCapacity(a.capacityId).order - getCapacity(b.capacityId).order);
}
