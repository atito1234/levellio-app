/**
 * Armory unlocks — cosmetic rewards bought with battle coins (gives coins a
 * purpose). Pure data; labels resolve via the `battle` i18n namespace
 * (`battle:unlocks.<id>`). Effects are cosmetic for now (shown as "owned").
 */
export interface BattleUnlock {
  id: string;
  emoji: string;
  cost: number;
}

export const BATTLE_UNLOCKS: readonly BattleUnlock[] = [
  { id: 'wisp-aura-violet', emoji: '🔮', cost: 100 },
  { id: 'wisp-aura-teal', emoji: '🟢', cost: 100 },
  { id: 'rite-candle', emoji: '🕯️', cost: 150 },
  { id: 'den-banner', emoji: '🏴', cost: 250 },
  { id: 'crown-slayer', emoji: '👑', cost: 500 },
];

export function unlockById(id: string): BattleUnlock | undefined {
  return BATTLE_UNLOCKS.find((u) => u.id === id);
}
