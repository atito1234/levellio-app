/**
 * Pre-battle "rites" — short mind & soul preparation games you do before facing a
 * dragon. Pure data + a default picker; labels resolve via the `battle` namespace
 * (`battle:rites.<id>.title` / `.blurb` / `.cta`). The UI lives in
 * PrepareRiteScreen.
 */
import type { QuestCategory } from '@/types';

export type RiteId = 'breathe' | 'vow' | 'recall' | 'charge';

export interface BattleRite {
  id: RiteId;
  emoji: string;
}

export const BATTLE_RITES: readonly BattleRite[] = [
  { id: 'breathe', emoji: '🫁' },
  { id: 'vow', emoji: '🔥' },
  { id: 'recall', emoji: '🏅' },
  { id: 'charge', emoji: '⚡' },
];

/** A sensible default rite for the dragon you face (and the habit's life-area). */
export function defaultRiteFor(dragonId: string, category?: QuestCategory): RiteId {
  if (dragonId === 'fear') return 'breathe';
  if (dragonId === 'doubt' || dragonId === 'unworthiness') return 'recall';
  if (dragonId === 'laziness') return 'charge';
  if (dragonId === 'procrastination' || dragonId === 'tooold') return 'vow';
  if (category === 'mind' || category === 'health') return 'breathe';
  if (category === 'fitness') return 'charge';
  return 'vow';
}
