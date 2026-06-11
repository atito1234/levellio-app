/**
 * Compounding habit model — the core "habits are a weighted network" engine.
 *
 * Two layers:
 *  - ACTIONS: concrete things you do (drink water, 10-min walk, lights out by 11).
 *  - CAPACITIES: what they build over time (Energy, Sleep, Endurance, Calm,
 *    Focus, Hydration), each tracked as a 0-100 ring level.
 *
 * One action feeds MULTIPLE capacities with different weights, so completing one
 * action ripples across several rings. Pure + deterministic; no I/O. Shapes map
 * cleanly onto future Firebase collections (capacities, actions, links, levels).
 *
 * Palette rule: capacity hues are violet/teal only; GOLD is reserved for a
 * completed (100%) ring and never used on a partial ring.
 */

/** The two non-achievement accent hues a capacity ring may use. */
export type CapacityColorId = 'violet' | 'teal';

export const CAPACITY_HEX: Record<CapacityColorId, string> = {
  violet: '#6C4CF1',
  teal: '#16C8A8',
};

/** Gold is reserved for a fully-charged (100%) ring / achievement only. */
export const ACHIEVEMENT_GOLD = '#FFB23E';

export type CapacityId = 'energy' | 'sleep' | 'endurance' | 'calm' | 'focus' | 'hydration';

export interface Capacity {
  id: CapacityId;
  name: string;
  colorId: CapacityColorId;
  order: number;
}

/** The six seeded capacities (alternating locked hues for distinction). */
export const CAPACITIES: readonly Capacity[] = [
  { id: 'energy', name: 'Energy', colorId: 'violet', order: 0 },
  { id: 'sleep', name: 'Sleep', colorId: 'teal', order: 1 },
  { id: 'endurance', name: 'Endurance', colorId: 'violet', order: 2 },
  { id: 'calm', name: 'Calm', colorId: 'teal', order: 3 },
  { id: 'focus', name: 'Focus', colorId: 'violet', order: 4 },
  { id: 'hydration', name: 'Hydration', colorId: 'teal', order: 5 },
];

export function getCapacity(id: CapacityId): Capacity {
  return CAPACITIES.find((c) => c.id === id) ?? CAPACITIES[0]!;
}

export interface Action {
  id: string;
  name: string;
}

/** Seed actions (the v4 starter set). */
export const ACTIONS: readonly Action[] = [
  { id: 'water', name: 'Drink a glass of water' },
  { id: 'walk', name: '10-minute walk' },
  { id: 'sleep-early', name: 'Lights out by 11' },
  { id: 'breathe', name: '2-minute breathing' },
  { id: 'sunlight', name: 'Morning sunlight' },
];

export function getAction(id: string): Action | undefined {
  return ACTIONS.find((a) => a.id === id);
}

/** Weight of an action's contribution to a capacity. */
export type LinkWeight = 'Light' | 'Medium' | 'Strong';

/** Numeric contribution (percentage points) per weight — even doubling scale. */
export const WEIGHT_VALUE: Record<LinkWeight, number> = {
  Light: 2,
  Medium: 4,
  Strong: 8,
};

export interface ActionCapacityLink {
  actionId: string;
  capacityId: CapacityId;
  weight: LinkWeight;
}

/**
 * Smart-default links so capacities are never empty. Every capacity is fed by
 * at least one action; every action feeds several capacities.
 */
export const ACTION_CAPACITY_LINKS: readonly ActionCapacityLink[] = [
  // Water — hydration first, with a lift to energy + endurance.
  { actionId: 'water', capacityId: 'hydration', weight: 'Strong' },
  { actionId: 'water', capacityId: 'energy', weight: 'Medium' },
  { actionId: 'water', capacityId: 'endurance', weight: 'Light' },
  // Walk — endurance + energy, a little calm + focus.
  { actionId: 'walk', capacityId: 'endurance', weight: 'Strong' },
  { actionId: 'walk', capacityId: 'energy', weight: 'Medium' },
  { actionId: 'walk', capacityId: 'calm', weight: 'Light' },
  { actionId: 'walk', capacityId: 'focus', weight: 'Light' },
  // Lights out by 11 — sleep, then energy + calm + focus next day.
  { actionId: 'sleep-early', capacityId: 'sleep', weight: 'Strong' },
  { actionId: 'sleep-early', capacityId: 'energy', weight: 'Medium' },
  { actionId: 'sleep-early', capacityId: 'calm', weight: 'Medium' },
  { actionId: 'sleep-early', capacityId: 'focus', weight: 'Light' },
  // Breathing — calm + focus, a touch of energy.
  { actionId: 'breathe', capacityId: 'calm', weight: 'Strong' },
  { actionId: 'breathe', capacityId: 'focus', weight: 'Medium' },
  { actionId: 'breathe', capacityId: 'energy', weight: 'Light' },
  // Morning sunlight — energy + sleep rhythm + focus.
  { actionId: 'sunlight', capacityId: 'energy', weight: 'Strong' },
  { actionId: 'sunlight', capacityId: 'sleep', weight: 'Medium' },
  { actionId: 'sunlight', capacityId: 'focus', weight: 'Medium' },
];

export interface CapacityDelta {
  capacityId: CapacityId;
  weight: LinkWeight;
  delta: number;
}

/**
 * The ripple of a single completed action: the ordered list of capacity deltas
 * (strongest first, then by capacity order). Pure.
 */
export function ripple(
  actionId: string,
  links: readonly ActionCapacityLink[] = ACTION_CAPACITY_LINKS,
): CapacityDelta[] {
  return links
    .filter((l) => l.actionId === actionId)
    .map((l) => ({ capacityId: l.capacityId, weight: l.weight, delta: WEIGHT_VALUE[l.weight] }))
    .sort((a, b) => b.delta - a.delta || getCapacity(a.capacityId).order - getCapacity(b.capacityId).order);
}

export type CapacityLevels = Record<CapacityId, number>;

export function emptyLevels(): CapacityLevels {
  return { energy: 0, sleep: 0, endurance: 0, calm: 0, focus: 0, hydration: 0 };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Apply one action's ripple to a levels map (clamped 0-100). Pure. */
export function applyRipple(
  levels: CapacityLevels,
  actionId: string,
  links: readonly ActionCapacityLink[] = ACTION_CAPACITY_LINKS,
): CapacityLevels {
  const next: CapacityLevels = { ...levels };
  for (const d of ripple(actionId, links)) {
    next[d.capacityId] = clamp(next[d.capacityId] + d.delta);
  }
  return next;
}

/** Derive capacity levels from a list of completed action ids (in order). */
export function capacityLevels(
  completedActionIds: readonly string[],
  links: readonly ActionCapacityLink[] = ACTION_CAPACITY_LINKS,
): CapacityLevels {
  return completedActionIds.reduce<CapacityLevels>((acc, id) => applyRipple(acc, id, links), emptyLevels());
}

/** Capacity ids an action strengthens (for the connections map + a11y labels). */
export function capacitiesForAction(
  actionId: string,
  links: readonly ActionCapacityLink[] = ACTION_CAPACITY_LINKS,
): CapacityId[] {
  return ripple(actionId, links).map((d) => d.capacityId);
}

/** Ring stroke color for a level: gold only at 100%, otherwise the capacity hue. */
export function ringColor(level: number, colorId: CapacityColorId): string {
  return level >= 100 ? ACHIEVEMENT_GOLD : CAPACITY_HEX[colorId];
}
