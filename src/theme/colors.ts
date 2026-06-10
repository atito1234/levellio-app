/**
 * Levellio color tokens.
 *
 * LOCKED BRAND PALETTE — do not change the core brand hues.
 *   violet #6C4CF1  -> identity / progress
 *   teal   #16C8A8  -> action / completion
 *   gold   #FFB23E  -> reward
 *
 * Art direction: modern flat illustration on neutral light surfaces.
 */

/** Raw brand hues. These three values are locked and must not change. */
export const brand = {
  violet: '#6C4CF1',
  teal: '#16C8A8',
  gold: '#FFB23E',
} as const;

/** Supporting tints/shades derived from the locked palette. */
const violetScale = {
  violetSoft: '#EDE9FE',
  violetMuted: '#B5A6F8',
  violet: brand.violet,
  violetDeep: '#4A32B0',
} as const;

const tealScale = {
  tealSoft: '#D6F7EF',
  teal: brand.teal,
  tealDeep: '#0E9A80',
} as const;

const goldScale = {
  goldSoft: '#FFEBCC',
  gold: brand.gold,
  goldDeep: '#D98A1A',
} as const;

/** Neutral light surfaces + text ramp. */
const neutral = {
  background: '#F7F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F6',
  border: '#E3E3EC',
  textPrimary: '#1B1B2A',
  textSecondary: '#5A5A72',
  textMuted: '#9A9AB0',
  textOnBrand: '#FFFFFF',
} as const;

const status = {
  success: brand.teal,
  warning: brand.gold,
  danger: '#E5484D',
} as const;

export const colors = {
  brand,
  ...violetScale,
  ...tealScale,
  ...goldScale,
  ...neutral,
  ...status,

  /** Semantic aliases — prefer these in components. */
  identity: brand.violet,
  progress: brand.violet,
  action: brand.teal,
  completion: brand.teal,
  reward: brand.gold,
} as const;

export type Colors = typeof colors;
export type ColorToken = keyof Colors;
