/**
 * The internal dragons — the adversaries a Battle is fought against. Naming the
 * enemy (laziness, fear, "I'm too old"…) externalizes it so the user can slay it.
 * Pure data + selectors; the visual is drawn separately in DragonSprite.
 */
export interface Dragon {
  id: string;
  name: string;
  /** What the dragon whispers to keep you stuck. */
  taunt: string;
  /** The line shown when it's slain. */
  victory: string;
  colorId: 'violet' | 'teal';
}

export const CUSTOM_DRAGON_ID = 'custom';

export const DRAGONS: readonly Dragon[] = [
  { id: 'laziness', name: 'the Dragon of Laziness', taunt: '“You’ll do it tomorrow…”', victory: 'Laziness slain — momentum is yours.', colorId: 'violet' },
  { id: 'fear', name: 'the Dragon of Fear', taunt: '“What if you fail?”', victory: 'Fear slain — you moved anyway.', colorId: 'teal' },
  { id: 'unworthiness', name: 'the Dragon of Unworthiness', taunt: '“You’re not good enough for this.”', victory: 'Unworthiness slain — you showed up for yourself.', colorId: 'violet' },
  { id: 'tooold', name: 'the Dragon of “Too Old”', taunt: '“It’s too late to change.”', victory: '“Too Old” slain — today counts.', colorId: 'teal' },
  { id: 'procrastination', name: 'the Dragon of Procrastination', taunt: '“Just five more minutes…”', victory: 'Procrastination slain — you started.', colorId: 'violet' },
  { id: 'doubt', name: 'the Dragon of Doubt', taunt: '“This won’t even work.”', victory: 'Doubt slain — proof over opinion.', colorId: 'teal' },
];

const CUSTOM_TEMPLATE: Dragon = {
  id: CUSTOM_DRAGON_ID,
  name: 'your Dragon',
  taunt: '“You can’t beat me.”',
  victory: 'Dragon slain — well fought.',
  colorId: 'violet',
};

/** Resolve a dragon by id. For the custom dragon, weave in the user's name. */
export function getDragon(id: string, customName?: string): Dragon {
  if (id === CUSTOM_DRAGON_ID) {
    const trimmed = customName?.trim();
    return trimmed
      ? { ...CUSTOM_TEMPLATE, name: `the Dragon of ${trimmed}`, victory: `${trimmed} slain — well fought.` }
      : CUSTOM_TEMPLATE;
  }
  return DRAGONS.find((d) => d.id === id) ?? DRAGONS[0]!;
}

/** Stable pick from any numeric seed (e.g. day of year). Pure. */
export function pickDragon(seed: number): Dragon {
  return DRAGONS[Math.abs(Math.floor(seed)) % DRAGONS.length]!;
}
